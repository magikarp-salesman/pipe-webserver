#!/bin/bash -eo pipefail

find /root/project/src | ENTR_INOTIFY_WORKAROUND=1 entr -r sh -c "
deno run --allow-net=:80 /root/project/src/modules/receiver.ts --port=80 | \
deno run /root/project/src/modules/favicon.ts  | \
deno run --allow-read='/root/docs' --allow-write='/root/docs' --allow-run /root/project/src/modules/vim-editor.ts --host='http://magikarp.sale'  | \
deno run --allow-net /root/project/src/modules/nostr.ts | \
deno run /root/project/src/modules/vim-to-markdown.ts | \
deno run --allow-read='/root/docs' --allow-write='/root/docs' /root/project/src/modules/markdown.ts --host='http://magikarp.sale'  | \
deno run /root/project/src/modules/markdown-to-html.ts  | \
deno run /root/project/src/modules/markdown-to-presentation.ts  | \
deno run --allow-read='/root/editor/last-edit' /root/project/src/modules/web-editor.ts | \
deno run --allow-run /root/project/src/modules/gotty-server.ts --gottyCommand=\"ssh -oStrictHostKeyChecking=no -i /root/.ssh/id_rsa 10.5.0.20 -t TERM=xterm-256color vim\" | \
deno run --allow-read='/root/docs'  /root/project/src/modules/blog.ts  | \
deno run --allow-read='/root/docs' --allow-write='/root/docs' /root/project/src/modules/facts.ts --database='/root/docs/facts.db'  | \
deno run --unstable --allow-net='10.5.0.10:9222' --allow-env /root/project/src/modules/ssr-html-page.ts --host='10.5.0.10'  | \
deno run /root/project/src/modules/minify-html.ts  | \
deno run --allow-read='/root/docs/.youtube_cache' --allow-run /root/project/src/modules/youtube-cache.ts --targetLocation='/root/docs/.youtube_cache'  | \
deno run --allow-net=localhost:80 /root/project/src/modules/emitter.ts --port=80 --server=localhost
"

# deno run --watch /root/project/src/modules/timed-basic-auth.ts --accepted='vim:simplythebest' --realm='vim is life' --allowedForXMinutes='30' | \
