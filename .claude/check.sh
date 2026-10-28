#!/bin/sh
# The repo has no ESLint config (and Next 16 dropped `next lint`), so the stop gate typechecks.
exec npm run --silent typecheck
