source ~/.vimrc
set nocompatible
set syntax=on
set modeline
set relativenumber
set backspace=indent,eol,start
set noswapfile
set nowrap

call plug#begin('./.vim/plugged')

" Use release branch (recommend)
Plug 'neoclide/coc.nvim', {'branch': 'release'}

Plug 'gruvbox-community/gruvbox'

" Initialize plugin system
"
Plug 'ekalinin/Dockerfile.vim'

call plug#end()

set background=dark
colorscheme gruvbox
