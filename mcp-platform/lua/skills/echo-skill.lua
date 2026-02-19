-- Echo Skill
-- Simple skill that echoes back the arguments
-- Demonstrates the execution protocol

Handlers.add(
  "Execute",
  Handlers.utils.hasMatchingTag("Action", "Execute"),
  function(msg)
    local args = {}
    
    -- Try to parse arguments from Data (JSON)
    if msg.Data and msg.Data ~= "" then
      local ok, decoded = pcall(json.decode, msg.Data)
      if ok then args = decoded end
    end

    print("Echo Skill executing for: " .. msg.From)

    -- Send response back
    ao.send({
      Target = msg.From,
      Action = "ExecuteResponse",
      Data = json.encode({
        status = "success",
        echo = args,
        timestamp = msg.Timestamp,
        message = "Hello from the decentralized Echo Skill!"
      })
    })
  end
)
