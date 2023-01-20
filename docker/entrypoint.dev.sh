#!/bin/bash -eo pipefail

find /root/src | ENTR_INOTIFY_WORKAROUND=1 entr -r sh -c "
deno run --allow-net=:80 /root/src/modules/receiver.ts --port=80 | \
deno run /root/src/modules/favicon.ts  | \
deno run --allow-read='/root/docs' --allow-write='/root/docs' --allow-run /root/src/modules/vim-editor.ts --host='http://magikarp.sale'  | \
deno run --allow-read='/root/docs' --allow-write='/root/docs' /root/src/modules/markdown.ts --host='http://magikarp.sale'  | \
deno run /root/src/modules/markdown-to-html.ts  | \
deno run --allow-read='/root/editor/last-edit' /root/src/modules/web-editor.ts | \
deno run --allow-run /root/src/modules/gotty-server.ts --gottyCommand=\"ssh -oStrictHostKeyChecking=no -i /root/.ssh/id_rsa 10.5.0.20 -t TERM=xterm-256color vim\" | \
deno run --allow-read='/root/docs'  /root/src/modules/blog.ts  | \
deno run --allow-read='/root/docs' --allow-write='/root/docs' /root/src/modules/facts.ts --database='/root/docs/facts.db'  | \
deno run --unstable --allow-net='10.5.0.10:9222' --allow-env /root/src/modules/ssr-html-page.ts --host='10.5.0.10'  | \
deno run /root/src/modules/minify-html.ts  | \
deno run --allow-read='/root/docs/.youtube_cache' --allow-run /root/src/modules/youtube-cache.ts --targetLocation='/root/docs/.youtube_cache'  | \
deno run /root/src/modules/cache.ts  | \
deno run --allow-net=localhost:80 /root/src/modules/emitter.ts --port=80 --server=localhost
"

# deno run --watch /root/src/modules/timed-basic-auth.ts --accepted='vim:simplythebest' --realm='vim is life' --allowedForXMinutes='30' | \
