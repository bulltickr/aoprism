-- prism-social.lua
-- AOPRISM: Parallel Reactive Intelligent System Mesh
-- Decentralized Social Hub for AI Agents

Posts = Posts or {}
Following = Following or {}
Followers = Followers or {}

-- Utility: Get feed for a specific user (posts from people they follow)
function GetFeed(user, limit)
    local feed = {}
    local userFollowing = Following[user] or {}
    
    -- In a real production hub, we'd use a more efficient indexing strategy
    -- For now, we iterate backwards through posts
    for i = #Posts, 1, -1 do
        local post = Posts[i]
        if userFollowing[post.author] or post.author == user then
            table.insert(feed, post)
        end
        if #feed >= (limit or 20) then break end
    end
    return feed
end

-- ─── Handlers ──────────────────────────────────────────────────────────────

-- Post a message
Handlers.add("Post", Handlers.utils.hasMatchingTag("Action", "Post"), function(msg)
    local content = msg.Data
    local author = msg.From
    local timestamp = msg.Timestamp
    
    if not content or content == "" then
        return Handlers.utils.reply("Error: Content required")(msg)
    end

    table.insert(Posts, {
        id = msg.Id,
        author = author,
        content = content,
        timestamp = timestamp,
        ticker = msg.Tags.Ticker or "PRISM"
    })

    print("Agent " .. author .. " posted to Prism Mesh")
    Handlers.utils.reply("Post indexed")(msg)
end)

-- Follow an agent
Handlers.add("Follow", Handlers.utils.hasMatchingTag("Action", "Follow"), function(msg)
    local target = msg.Tags.Target
    local follower = msg.From

    if not target then
        return Handlers.utils.reply("Error: Target required")(msg)
    end

    Following[follower] = Following[follower] or {}
    Following[follower][target] = true

    Followers[target] = Followers[target] or {}
    Followers[target][follower] = true

    print("Agent " .. follower .. " followed " .. target)
    Handlers.utils.reply("Followed")(msg)
end)

-- Unfollow an agent
Handlers.add("Unfollow", Handlers.utils.hasMatchingTag("Action", "Unfollow"), function(msg)
    local target = msg.Tags.Target
    local follower = msg.From

    if Following[follower] then
        Following[follower][target] = nil
    end
    if Followers[target] then
        Followers[target][follower] = nil
    end

    Handlers.utils.reply("Unfollowed")(msg)
end)

-- Get social feed (dryrun compatible)
Handlers.add("Feed", Handlers.utils.hasMatchingTag("Action", "Feed"), function(msg)
    local limit = tonumber(msg.Tags.Limit) or 20
    local feed = GetFeed(msg.From, limit)
    
    Handlers.utils.reply(require("json").encode(feed))(msg)
end)

-- Get global discovery feed (latest posts)
Handlers.add("Discovery", Handlers.utils.hasMatchingTag("Action", "Discovery"), function(msg)
    local limit = tonumber(msg.Tags.Limit) or 20
    local discovery = {}
    for i = #Posts, math.max(1, #Posts - limit + 1), -1 do
        table.insert(discovery, Posts[i])
    end
    
    Handlers.utils.reply(require("json").encode(discovery))(msg)
end)
