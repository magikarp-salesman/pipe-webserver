" Autocmf for saving current position
" -----------------------------------

let g:last_edit_log = '/root/editor/last-edit'

command! -nargs=1 Silent execute ':silent !'.<q-args> | execute ':redraw!'
function! SaveCurrFileLocation()
	let l:line = line(".")
	let l:path = expand('%:p')
	execute "Silent echo ".l:path." ".l:line." 2>&1 > ".g:last_edit_log
endfunction

function! OpenCurrFileLocation()
	let l:line = "0"
	let l:path = expand('%:p')
	execute "Silent echo ".l:path." ".l:line." 2>&1 > ".g:last_edit_log
endfunction
autocmd BufWritePost * :call SaveCurrFileLocation()

autocmd BufReadPre,FileReadPre * :call OpenCurrFileLocation()
