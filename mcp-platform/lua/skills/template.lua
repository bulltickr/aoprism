--[[
  Skill Template
  Copy this to create a new capability for your agent.
]]

local Skill = {
  Name = "MySkill",
  Description = "A description of what this skill does",
  
  -- The Kernel uses these to route messages to your Execute function
  Patterns = {
    { check = "Action", value = "MyAction" }
    -- Add more patterns here
  },

  -- The Logic
  -- @param msg: The incoming AO message
  -- @param kernel: Access to global Kernel state (optional)
  Execute = function(msg, kernel)
    print("Skill Executing...")
    
    -- Your Logic Here
    local data = msg.Data
    
    -- Reply
    ao.send({
      Target = msg.From,
      Action = "MyResponse",
      Data = "Hello from MySkill!"
    })
  end
}

return Skill
