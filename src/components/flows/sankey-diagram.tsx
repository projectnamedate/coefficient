"use client";

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from "d3-sankey";

interface FlowData {
  pools: { id: string; name: string }[];
  validators: { pubkey: string; name: string }[];
  flows: { source: string; target: string; value: number }[];
}

interface SNode {
  id: string;
  name: string;
  type: "pool" | "validator";
}

interface SLink {
  source: string;
  target: string;
  value: number;
}

export function SankeyDiagram({ data }: { data: FlowData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: Math.max(500, data.validators.length * 28 + 100),
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data.validators.length]);

  useEffect(() => {
    if (!svgRef.current || data.flows.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 20, right: 180, bottom: 20, left: 140 };

    // Build nodes: pools on left, validators on right
    const nodes: SNode[] = [
      ...data.pools.map((p) => ({ id: `pool-${p.id}`, name: p.name, type: "pool" as const })),
      ...data.validators.map((v) => ({ id: `val-${v.pubkey}`, name: v.name, type: "validator" as const })),
    ];

    const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

    const links: { source: number; target: number; value: number }[] = data.flows
      .filter((f) => nodeMap.has(`pool-${f.source}`) && nodeMap.has(`val-${f.target}`))
      .map((f) => ({
        source: nodeMap.get(`pool-${f.source}`)!,
        target: nodeMap.get(`val-${f.target}`)!,
        value: f.value,
      }));

    if (links.length === 0) return;

    const sankeyGenerator = sankey<SNode, SLink>()
      .nodeId((d: any) => d.index)
      .nodeWidth(12)
      .nodePadding(8)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    const graph = sankeyGenerator({
      nodes: nodes.map((n) => ({ ...n })) as any[],
      links: links.map((l) => ({ ...l })) as any[],
    });

    const poolColor = "#b5b2d9"; // lavender
    const valColor = "#4e5fab"; // info blue
    const linkColor = "rgba(181, 178, 217, 0.15)";
    const linkHoverColor = "rgba(181, 178, 217, 0.4)";

    // Links
    svg
      .append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", (d: any) => Math.max(1, d.width))
      .attr("class", "flow-link")
      .attr("data-source", (d: any) => d.source.id)
      .attr("data-target", (d: any) => d.target.id)
      .style("transition", "stroke 0.2s")
      .on("mouseover", function (event: any, d: any) {
        d3.select(this).attr("stroke", linkHoverColor);
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", linkColor);
      });

    // Nodes
    svg
      .append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .join("rect")
      .attr("x", (d: any) => d.x0)
      .attr("y", (d: any) => d.y0)
      .attr("width", (d: any) => d.x1 - d.x0)
      .attr("height", (d: any) => Math.max(1, d.y1 - d.y0))
      .attr("fill", (d: any) => (d.type === "pool" ? poolColor : valColor))
      .attr("rx", 2)
      .attr("opacity", 0.85)
      .style("cursor", "pointer")
      .on("mouseover", function (event: any, d: any) {
        d3.select(this).attr("opacity", 1);
        // Highlight connected links
        svg
          .selectAll(".flow-link")
          .attr("stroke", function () {
            const el = d3.select(this);
            if (el.attr("data-source") === d.id || el.attr("data-target") === d.id) {
              return linkHoverColor;
            }
            return "rgba(181, 178, 217, 0.05)";
          });
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.85);
        svg.selectAll(".flow-link").attr("stroke", linkColor);
      });

    // Labels
    svg
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .attr("x", (d: any) => (d.type === "pool" ? d.x0 - 6 : d.x1 + 6))
      .attr("y", (d: any) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d: any) => (d.type === "pool" ? "end" : "start"))
      .attr("fill", "rgba(205, 200, 189, 0.6)")
      .attr("font-size", "11px")
      .attr("font-family", "ui-monospace, monospace")
      .text((d: any) => d.name);

  }, [data, dimensions]);

  if (data.flows.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-beige/30">
        No delegation flow data available
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block"
      />
    </div>
  );
}
