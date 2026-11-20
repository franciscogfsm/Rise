---
description: Prove with RISE whether this project's storage can migrate to another cloud
argument-hint: "<goal and where to, e.g. move to Leaseweb>"
---
Use the RISE MCP tools to answer: "$ARGUMENTS".

1. Call `rise_connections`. Map the clouds the user named to connection ids (the app's current cloud is the reference, the
   cloud they want is the target; several targets = a comparison, max 4). If they named none, use the defaults.
2. Call `rise_check` with `path` = the current project folder, `goal` = the user's words, and the ids from step 1.
3. Reply in the user's language: the answer first in one line, then the exact change (if any) and where it goes in THIS
   codebase (find the file and line with your own tools and show the edit, but do not apply it unless asked), then the top
   risks with file:line, then the evidence link. Say clearly which clouds are simulated. Never invent results: everything comes
   from the tool output.
