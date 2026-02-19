-- List & Get Handlers
-- Action: ListSkills, GetSkill

-- GetSkill
Handlers.add(
  "GetSkill",
  Handlers.utils.hasMatchingTag("Action", "GetSkill"),
  function(msg)
    local id = msg.Tags.Id or msg.Tags.Name
    local skill = Skills[id]

    -- If not found by ID, try finding by name
    if not skill and msg.Tags.Name then
      for _, s in pairs(Skills) do
        if s.name == msg.Tags.Name then
          skill = s
          break
        end
      end
    end

    if not skill then
      ao.send({Target = msg.From, Action = "GetSkillError", Data = "Skill not found"})
      return
    end

    ao.send({
      Target = msg.From,
      Action = "GetSkillResponse",
      Data = json.encode(skill)
    })
  end
)

-- ListSkills
Handlers.add(
  "ListSkills",
  Handlers.utils.hasMatchingTag("Action", "ListSkills"),
  function(msg)
    local list = {}
    for _, skill in pairs(Skills) do
      table.insert(list, {
        id = skill.id,
        name = skill.name,
        description = skill.description,
        processId = skill.processId,
        author = skill.author,
        version = skill.version,
        tags = skill.tags
      })
    end

    ao.send({
      Target = msg.From,
      Action = "ListSkillsResponse",
      Data = json.encode(list)
    })
  end
)
