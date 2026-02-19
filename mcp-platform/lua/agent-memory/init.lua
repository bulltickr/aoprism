-- Agent Memory Initialization
-- State: AgentMemory[agentId][key] = { value, updatedAt }

if not AgentMemory then AgentMemory = {} end

REGISTRY_VERSION = "0.1.0"

-- Info Handler
Handlers.add(
  "Info",
  Handlers.utils.hasMatchingTag("Action", "Info"),
  function(msg)
    ao.send({
      Target = msg.From,
      Action = "InfoResponse",
      Version = REGISTRY_VERSION,
      Data = json.encode({
        Version = REGISTRY_VERSION,
        TotalAgents = #(utils.keys(AgentMemory))
      })
    })
  end
)

print("Agent Memory Store initialized v" .. REGISTRY_VERSION)
