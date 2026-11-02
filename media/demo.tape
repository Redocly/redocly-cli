# Records media/demo.gif for the README.
#
# Requirements: VHS (brew install vhs), a compiled CLI (npm run compile),
# and the claude CLI on PATH for the generate-arazzo --with-ai step.
# Run from the repository root:
#
#   vhs media/demo.tape
#   ffmpeg -y -i media/demo-raw.gif -vf "scale=1024:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" media/demo.gif
#   rm media/demo-raw.gif
#
# The ffmpeg step scales the GIF to the README width. Keep 128 colors: fewer colors turn green into yellow.
# The demo API in media/demo/cafe-split is the Cafe API with three planted errors.
# The generate-arazzo step sends media/demo/museum.yaml to the AI provider.
# The respect step needs network access to the Redocly Museum mock server.

Output media/demo-raw.gif

Set Shell bash
Set FontFamily "JetBrains Mono"
Set FontSize 14
Set Width 1280
Set Height 760
Set Padding 24
Set Framerate 15
# GitHub Dark with a deeper red, so that error labels stay readable.
Set Theme { "name": "Redocly Dark", "background": "#101216", "foreground": "#e6edf3", "black": "#000000", "red": "#da3633", "green": "#56d364", "yellow": "#e3b341", "blue": "#6ca4f8", "magenta": "#db61a2", "cyan": "#2b7489", "white": "#ffffff", "brightBlack": "#6e7681", "brightRed": "#f78166", "brightGreen": "#56d364", "brightYellow": "#e3b341", "brightBlue": "#6ca4f8", "brightMagenta": "#db61a2", "brightCyan": "#2b7489", "brightWhite": "#ffffff", "cursor": "#c9d1d9", "selection": "#3b5070" }
Set TypingSpeed 75ms
Set WindowBar Colorful
Set BorderRadius 8

Hide
Type "cd media/demo && export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 REDOCLY_TELEMETRY=off REDOCLY_SUPPRESS_NOTIFICATIONS=true && rm -f museum.arazzo.yaml" Enter
Type "alias redocly='node ../../packages/cli/lib/index.js'" Enter
# Green prompt, bold blue command text, and a color reset before the command runs.
Type `PS1='\[\e[1;32m\]$ \[\e[1;94m\]'; trap 'printf "\e[0m"' DEBUG` Enter
Type "clear" Enter
Show

Sleep 1s
Type "redocly lint cafe-split/cafe.yaml --format=stylish"
Sleep 1s
Enter
Sleep 7s

Hide
Type "clear" Enter
Show
Sleep 1s
Type "redocly generate-arazzo museum.yaml --with-ai -o museum.arazzo.yaml"
Sleep 1s
Enter
Sleep 4s
# The AI provider takes about a minute. The recording skips the wait.
Hide
Wait+Line@5m /^\$ ?$/
Show
Sleep 6s

Hide
Type "clear" Enter
Show
Sleep 1s
Type "redocly respect museum-tickets.arazzo.yaml"
Sleep 1s
Enter
Sleep 6s

Hide
Type "rm -f museum.arazzo.yaml" Enter
