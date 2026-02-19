-- Register Skill Handler
-- Action: RegisterSkill
-- Tags: Name, Description, ProcessId, Version, Tags (comma separated)
-- Data: InputSchema (JSON)

Handlers.add(
  "RegisterSkill",
  Handlers.utils.hasMatchingTag("Action", "RegisterSkill"),
  function(msg)
    local name = msg.Tags.Name
    local description = msg.Tags.Description or ""
    local processId = msg.Tags.ProcessId
    local version = msg.Tags.Version or "0.1.0"
    local tagsRaw = msg.Tags.Tags or ""
    local inputSchema = msg.Data or "{}"

    -- Validation
    if not name or name == "" then
      ao.send({Target = msg.From, Action = "RegisterError", Data = "Name is required"})
      return
    end
    if not processId or #processId ~= 43 then
      ao.send({Target = msg.From, Action = "RegisterError", Data = "Valid ProcessId is required"})
      return
    end

    -- Split tags
    local tags = {}
    for tag in string.gmatch(tagsRaw, "([^,]+)") do
      table.insert(tags, tag:match("^%s*(.-)%s*$"))
    end

    -- Generate ID (hash of name and author)
    local id = crypto.utils.sha256(name .. msg.From)

    -- Check if it exists (only author can update)
    if Skills[id] and Skills[id].author ~= msg.From then
      ao.send({Target = msg.From, Action = "RegisterError", Data = "Skill already exists and is owned by someone else"})
      return
    end

    -- Store
    Skills[id] = {
      id = id,
      name = name,
      description = description,
      processId = processId,
      version = version,
      tags = tags,
      author = msg.From,
      inputSchema = inputSchema,
      createdAt = msg.Timestamp,
      updatedAt = msg.Timestamp,
      status = "active"
    }

    print("Registered skill: " .. name .. " (ID: " .. id .. ")")

    ao.send({
      Target = msg.From,
      Action = "RegisterSuccess",
      Id = id,
      Data = "Skill registered successfully"
    })
  end
)
