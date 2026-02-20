-- Skills Registry Initialization
-- Set up storage and basic handlers

if not Skills then Skills = {} end

-- Owner is the process that can perform admin tasks (like deleting skills)
Owner = Owner or ao.env.Process.Owner

-- Constants
REGISTRY_VERSION = "0.1.0"

-- Utility: Find skill by name
function findSkillByName(name)
  for id, skill in pairs(Skills) do
    if skill.name == name then
      return id, skill
    end
  end
  return nil
end

-- Info Handler
Handlers.add(
  "Info",
  Handlers.utils.hasMatchingTag("Action", "Info"),
  function(msg)
    ao.send({
      Target = msg.From,
      Action = "InfoResponse",
      Version = REGISTRY_VERSION,
      SkillCount = tostring(#(utils.keys(Skills))),
      Data = json.encode({
        Version = REGISTRY_VERSION,
        SkillCount = #(utils.keys(Skills))
      })
    })
  end
)

print("Skills Registry initialized v" .. REGISTRY_VERSION)
