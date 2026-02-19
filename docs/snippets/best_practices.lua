--[[
  AO HANDLER BEST PRACTICES
]]

-- 1. PATTERN MATCHING
-- Use simple Tag matching where possible.
Patterns = {
  { check = "Action", value = "MyAction" }
}

-- 2. JSON HANDLING
-- Use the global `json` object.
local payload = json.decode(msg.Data)
local response = json.encode({ status = "ok" })

-- 3. ERROR HANDLING
-- Always validate input.
if not msg.Data then
  ao.send({Target = msg.From, Action = "Error", Data = "Missing Data"})
  return
end

-- 4. TAGS
-- Always tag your responses so the receiver knows what happened.
ao.send({
  Target = msg.From,
  Action = "Processed",
  ["X-Status"] = "Success",
  Data = response
})
