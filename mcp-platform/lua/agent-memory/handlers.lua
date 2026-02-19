-- Store & Retrieve Handlers
-- Action: StoreMemory, GetMemory, ListMemory, DeleteMemory

-- StoreMemory
Handlers.add(
  "StoreMemory",
  Handlers.utils.hasMatchingTag("Action", "StoreMemory"),
  function(msg)
    local agentId = msg.Tags.AgentId or msg.From
    local key = msg.Tags.Key
    local value = msg.Data
    
    if not key or key == "" then
      ao.send({Target = msg.From, Action = "StoreError", Data = "Key is required"})
      return
    end

    if not AgentMemory[agentId] then AgentMemory[agentId] = {} end
    
    AgentMemory[agentId][key] = {
      value = value,
      updatedAt = msg.Timestamp
    }

    print("Stored memory for agent: " .. agentId .. " | key: " .. key)

    ao.send({
      Target = msg.From,
      Action = "StoreSuccess",
      Key = key,
      Data = "Memory stored successfully"
    })
  end
)

-- GetMemory
Handlers.add(
  "GetMemory",
  Handlers.utils.hasMatchingTag("Action", "GetMemory"),
  function(msg)
    local agentId = msg.Tags.AgentId or msg.From
    local key = msg.Tags.Key
    
    if not AgentMemory[agentId] or not AgentMemory[agentId][key] then
      ao.send({Target = msg.From, Action = "GetMemoryError", Data = "Memory not found"})
      return
    end

    ao.send({
      Target = msg.From,
      Action = "GetMemoryResponse",
      Key = key,
      Data = AgentMemory[agentId][key].value,
      UpdatedAt = tostring(AgentMemory[agentId][key].updatedAt)
    })
  end
)

-- ListMemory
Handlers.add(
  "ListMemory",
  Handlers.utils.hasMatchingTag("Action", "ListMemory"),
  function(msg)
    local agentId = msg.Tags.AgentId or msg.From
    local keys = {}
    
    if AgentMemory[agentId] then
      for key, data in pairs(AgentMemory[agentId]) do
        table.insert(keys, {
          key = key,
          updatedAt = data.updatedAt
        })
      end
    end

    ao.send({
      Target = msg.From,
      Action = "ListMemoryResponse",
      Data = json.encode(keys)
    })
  end
)

-- DeleteMemory
Handlers.add(
  "DeleteMemory",
  Handlers.utils.hasMatchingTag("Action", "DeleteMemory"),
  function(msg)
    local agentId = msg.Tags.AgentId or msg.From
    local key = msg.Tags.Key
    
    if AgentMemory[agentId] and AgentMemory[agentId][key] then
      AgentMemory[agentId][key] = nil
      ao.send({Target = msg.From, Action = "DeleteSuccess", Key = key})
    else
      ao.send({Target = msg.From, Action = "DeleteError", Data = "Memory not found"})
    end
  end
)
