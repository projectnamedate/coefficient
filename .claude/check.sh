#!/bin/sh
# `npm run lint` is `next lint`, which Next 16 removed, and the repo has no ESLint config; typecheck instead.
exec ./node_modules/.bin/tsc --noEmit
