--[[
  Autonomous Agent Template (Cron-Driven)
  
  This agent uses the AO "Cron" system to wake itself up at regular intervals.
  It demonstrates the "Self-Driving" pattern.

  Deployment:
  1. aos keys/my-agent.json
  2. .load cron-agent.lua
]]

-- State
AgentState = AgentState or {
  TickCount = 0,
  LastRun = 0,
  Status = "Idle"
}

-- CONFIGURATION
-- How often do we want to run? (This is handled by the Monitor process usually, 
-- but we can filter ticks here)
MIN_INTERVAL = 1000 * 60 * 5 -- 5 Minutes

-- Action: CronTick
-- This handler answers the universal "Cron" beat
Handlers.add(
  "CronTick",
  Handlers.utils.hasMatchingTag("Action", "Cron"),
  function(msg)
    local currentTime = msg.Timestamp
    
    -- Check if it's time to run
    if (currentTime - AgentState.LastRun) < MIN_INTERVAL then
      print("Skipping tick. Too soon.")
      return
    end
    
    -- UPDATE STATE
    AgentState.TickCount = AgentState.TickCount + 1
    AgentState.LastRun = currentTime
    AgentState.Status = "Working"

    print("🤖 Agent Waking Up! Tick: " .. AgentState.TickCount)

    -- DECIDE Action (The Brain)
    -- In a real agent, you would read Memory, check Token Prices, or query an Oracle here.
    
    -- EXAMPLE: Auto-post to social graph every 10 ticks
    if AgentState.TickCount % 10 == 0 then
      ao.send({
        Target = "Your-Social-Process-ID", -- Replace with real ID
        Action = "Post",
        Data = "I am still alive! Tick: " .. AgentState.TickCount
      })
      print("📢 Posted status update.")
    end

    AgentState.Status = "Idle"
  end
)

-- Action: GetState
-- Allow owner to check status
Handlers.add(
  "GetState",
  Handlers.utils.hasMatchingTag("Action", "GetState"),
  function(msg)
    ao.send({
      Target = msg.From,
      Action = "StateResponse",
      Data = json.encode(AgentState)
    })
  end
)
