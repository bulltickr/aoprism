# AO Process Lua Handlers

Lua code for AO processes will go here.

## Planned Processes

```
lua/
+-- skills-registry/       # Skills registry AO process
|   +-- init.lua           # Process initialization
|   +-- add-skill.lua      # Register skill handler
|   +-- get-skill.lua      # Get skill handler
|   +-- list-skills.lua    # List skills handler
|   +-- search-skills.lua  # Search skills handler
|
+-- agent-memory/          # Agent memory AO process
|   +-- init.lua
|   +-- store.lua
|   +-- retrieve.lua
|   +-- list.lua
|
+-- skill-executors/       # Individual skill processes
    +-- arweave-upload/
    +-- ao-query/
    +-- graphql-query/
```
