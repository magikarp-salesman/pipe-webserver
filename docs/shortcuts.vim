:ec 'GitHub magikarp-salesman'            :!open 'https://github.com/magikarp-salesman'
:ec 'Google.com'                          :!open 'http://www.google.com'
:ec 'ChatGPT'                             :!open 'https://openai.com/blog/chatgpt/'

" You can also use <NL> to separate commands in the same way as with '|'.  To
" insert a <NL> use CTRL-V CTRL-J.  \"^@\" will be shown.  Using '|' is the
" preferred method.  But for external commands a <NL> must be used, because a
" '|' is included in the external command.  To avoid the special meaning of <NL>
" it must be preceded with a backslash.  Example: >
"       :r !date<NL>-join

 vim:ft=vim nowrap incsearch
