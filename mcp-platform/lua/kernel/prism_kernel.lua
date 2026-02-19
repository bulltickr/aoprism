--[[
  💎 PRISM KERNEL v1.0
  The Micro-Operating System for AOPRISM Agents.
  
  Features:
  - Skill Loader (Hot-Code Swapping)
  - Message Router
  - Memory Management
]]

-- GLOBAL STATE
Kernel = Kernel or {
  Skills = {},     -- Loaded capabilities
  Version = "1.0.0"
}

-- UTILS
function IsAuthorized(msg)
  return msg.From == Owner or msg.From == ao.id
end

-- CORE HANDLER: LoadSkill
-- Dynamically loads a new capability into the agent
Handlers.add(
  "Kernel.LoadSkill",
  Handlers.utils.hasMatchingTag("Action", "LoadSkill"),
  function(msg)
    if not IsAuthorized(msg) then
      print("Unauthorized LoadSkill attempt from: " .. msg.From)
      return
    end

    local code = msg.Data
    local skillName = msg.Tags.SkillName

    -- Safety Check
    if not code or code == "" then
      ao.send({Target = msg.From, Action = "LoadError", Data = "No code provided"})
      return
    end

    -- Compile and Load
    local func, err = load(code, skillName, "t", _G)
    if not func then
      ao.send({Target = msg.From, Action = "LoadError", Data = "Syntax Error: " .. err})
      return
    end

    -- Execute the chunk. It should return a Skill Table.
    local status, result = pcall(func)
    if not status then
      ao.send({Target = msg.From, Action = "LoadError", Data = "Runtime Error: " .. result})
      return
    end

    -- Register the Skill
    if type(result) ~= "table" or not result.Name then
      ao.send({Target = msg.From, Action = "LoadError", Data = "Code must return a Skill table with a Name"})
      return
    end

    Kernel.Skills[result.Name] = result
    
    -- Register Handlers automatically
    -- The Skill defines patterns, we inject them into the Handler system
    if result.Patterns then
      for i, pattern in ipairs(result.Patterns) do
        local handlerName = "Skill." .. result.Name .. "." .. i
        Handlers.add(
          handlerName,
          Handlers.utils.hasMatchingTag(pattern.check, pattern.value),
          function(m)
            -- Execute Skill Logic with Safe State Access
            result.Execute(m, Kernel)
          end
        )
      end
    end

    print("Loaded Skill: " .. result.Name)
    ao.send({Target = msg.From, Action = "LoadSuccess", Data = "Skill " .. result.Name .. " loaded."})
  end
)

-- CORE HANDLER: ListSkills
Handlers.add(
  "Kernel.ListSkills",
  Handlers.utils.hasMatchingTag("Action", "ListSkills"),
  function(msg)
    local list = {}
    for name, skill in pairs(Kernel.Skills) do
      table.insert(list, { Name = name, Description = skill.Description })
    end
    ao.send({Target = msg.From, Action = "SkillList", Data = json.encode(list)})
  end
)

-- HIVE MIND: Evolve
-- Asks the Registry for a skill
Handlers.add(
  "Kernel.Evolve",
  Handlers.utils.hasMatchingTag("Action", "Evolve"),
  function(msg)
    local skillName = msg.Tags.SkillName
    local registryId = msg.Tags.RegistryId -- Or hardcode a default

    if not skillName or not registryId then
      ao.send({Target = msg.From, Data = "Usage: Action=Evolve, SkillName=..., RegistryId=..."})
      return
    end

    print("🧬 Evolving... Fetching " .. skillName .. " from Hive Mind.")
    
    ao.send({
        Target = registryId,
        Action = "GetSkill",
        Tags = { Name = skillName }
    })
  end
)

-- HIVE MIND: Install (Response from Registry)
Handlers.add(
  "Kernel.Install",
  Handlers.utils.hasMatchingTag("Action", "SkillPackage"),
  function(msg)
    local code = msg.Data
    local name = msg.Tags.SkillName
    
    if not code then return end

    print("📦 Installing Skill Package: " .. name)

    -- Reuse the LoadSkill logic (Internal call or duplicate logic)
    -- Ideally we refactor LoadSkill to a function, but for now we duplicate the safe load:
    
    local func, err = load(code, name, "t", _G)
    if func then
        local status, result = pcall(func)
        if status and type(result) == "table" and result.Name then
            Kernel.Skills[result.Name] = result
            
            -- Register Handlers
            if result.Patterns then
              for i, pattern in ipairs(result.Patterns) do
                local handlerName = "Skill." .. result.Name .. "." .. i
                Handlers.add(
                  handlerName,
                  Handlers.utils.hasMatchingTag(pattern.check, pattern.value),
                  function(m) result.Execute(m, Kernel) end
                )
              end
            end
            print("✨ Evolution Complete: Learned " .. result.Name)
            ao.send({Target = Owner, Action = "EvolveSuccess", Data = "I now know " .. result.Name})
        end
    else
        print("❌ Evolution Failed: " .. err)
    end
  end
)

print("💎 PRISM Kernel Loaded.")
