-- AO Security Blueprint: Permissioned Handlers
-- Use this template when deploying autonomous agent processes.

local owner = "OUR_OWNER_ADDRESS"

-- 1. Restrict state-changing actions to specific owners
Handlers.prepend(
  "security-guard",
  function (msg)
    local sensitiveActions = { "Update", "Withdraw", "Transfer" }
    for _, action in ipairs(sensitiveActions) do
      if msg.Tags.Action == action and msg.From ~= owner then
        print("Unauthorized attempt from " .. msg.From)
        return "break"
      end
    end
    return "continue"
  end
)

-- 2. Standard AO Token Standard compliance
-- (Refer to ao_knowledge_query for full spec)
