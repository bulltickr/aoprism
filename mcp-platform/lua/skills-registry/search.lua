-- Search Handler
-- Action: SearchSkills
-- Tags: Query, Tag

Handlers.add(
  "SearchSkills",
  Handlers.utils.hasMatchingTag("Action", "SearchSkills"),
  function(msg)
    local query = (msg.Tags.Query or ""):lower()
    local filterTag = msg.Tags.Tag or ""
    local results = {}

    for _, skill in pairs(Skills) do
      local matches = false

      -- Search in name and description
      if query ~= "" then
        if skill.name:lower():find(query) or skill.description:lower():find(query) then
          matches = true
        end
      end

      -- Filter by tag
      if filterTag ~= "" then
        local tagMatch = false
        for _, t in ipairs(skill.tags) do
          if t == filterTag then
            tagMatch = true
            break
          end
        end
        
        -- If query was specified, it must match BOTH query and tag
        -- If only tag was specified, it must match tag
        if query ~= "" then
          matches = matches and tagMatch
        else
          matches = tagMatch
        end
      end

      if matches then
        table.insert(results, {
          id = skill.id,
          name = skill.name,
          description = skill.description,
          processId = skill.processId,
          author = skill.author,
          version = skill.version,
          tags = skill.tags
        })
      end
    end

    ao.send({
      Target = msg.From,
      Action = "SearchSkillsResponse",
      Data = json.encode(results)
    })
  end
)
