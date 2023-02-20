-- Open this file in the script editor
-- Save this file as Application
-- Add the following code to the MyApp.app/Contents/Info.plist file
(*
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- ... -->
  
  <!-- Add this section: -->
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>VIM URL</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>vim</string>
        <string>vims</string>
      </array>
    </dict>
  </array>
  <!-- End of what needs adding -->
  
</dict>
</plist>
*)
-- Install mvim
-- Install the RCDefaultApp
-- Make the handler for mvim URLs the application
-- To test the application: open -a MyApp.app mvim://www.example.com/test.html
--
-- source: https://gist.github.com/georgebrock/9ab3d83bf160b7c1c2b0

on is_running(appName)
	tell application "System Events" to (name of processes) contains appName
end is_running

on open location this_URL
	set iTermRunning to is_running("iTerm2")
	set http_url to replace_chars(this_URL, "vim://", "http://")
	set http_url2 to replace_chars(this_URL, "vims://", "https://")
	tell application "iTerm"
		activate
		if not (iTermRunning) then
			delay 0.5
			close the current window
		end if
		set newWindow to (create window with profile "vIM")
		tell current session of newWindow
			write text ":e " & http_url
		end tell
	end tell
end open location

on replace_chars(this_text, search_string, replacement_string)
	set AppleScript's text item delimiters to the search_string
	set the item_list to every text item of this_text
	set AppleScript's text item delimiters to the replacement_string
	set this_text to the item_list as string
	set AppleScript's text item delimiters to ""
	return this_text
end replace_chars