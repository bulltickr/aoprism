--[[
  🐝 HIVE MIND REGISTRY v1.0
  The Decentralized App Store for AO Agents.
  
  Functions:
  - Register(Name, Description, Code)
  - GetSkill(Name)
  - ListSkills()
]]

Registry = Registry or {
  Skills = {} 
}

-- HANDLER: Register
-- Devs publish new skills here
Handlers.add(
  "Registry.Register",
  Handlers.utils.hasMatchingTag("Action", "Register"),
  function(msg)
    local name = msg.Tags.Name
    local desc = msg.Tags.Description
    local code = msg.Data
    
    if not name or not code then
      ao.send({Target = msg.From, Data = "Error: Missing Name or Code"})
      return
    end

    Registry.Skills[name] = {
      Name = name,
      Description = desc or "No description",
      Code = code,
      Publisher = msg.From,
      Timestamp = msg.Timestamp
    }

    print("📢 New Skill Registered: " .. name)
    ao.send({Target = msg.From, Data = "Registered " .. name})
  end
)

-- HANDLER: GetSkill
-- Agents download skills from here
Handlers.add(
  "Registry.GetSkill",
  Handlers.utils.hasMatchingTag("Action", "GetSkill"),
  function(msg)
    local name = msg.Tags.Name
    local skill = Registry.Skills[name]

    if not skill then
      ao.send({Target = msg.From, Action = "Error", Data = "Skill not found: " .. (name or "nil")})
      return
    end

    print("📦 Serving Skill: " .. name .. " to " .. msg.From)
    
    ao.send({
      Target = msg.From,
      Action = "SkillPackage",
      Tags = { SkillName = skill.Name },
      Data = skill.Code
    })
  end
)

-- HANDLER: ListSkills
-- UI lists available skills
Handlers.add(
  "Registry.List",
  Handlers.utils.hasMatchingTag("Action", "ListSkills"),
  function(msg)
    local list = {}
    for name, data in pairs(Registry.Skills) do
      table.insert(list, { 
        Name = name, 
        Description = data.Description, 
        Publisher = data.Publisher 
      })
    end
    
    ao.send({
      Target = msg.From,
      Action = "SkillList",
      Data = json.encode(list)
    })
  end
)
