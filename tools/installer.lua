-- TXT installer for rw4-ebook-reader. Resource/API usage follows the supplied
-- Watch 4 sample; installation still requires verification on real hardware.
local lvgl = require('lvgl')
local directory = '/data/quickapp/mass/__PACKAGE__'
local target = directory .. '/__FILENAME__'
local expectedSize = __SIZE__
local root = lvgl.Object(nil, {
    outline_width = 0, border_width = 0, pad_all = 0,
    bg_opa = lvgl.OPA(100), bg_color = 0,
    align = lvgl.ALIGN.CENTER, w = 336, h = 450
})
root:clear_flag(lvgl.FLAG.SCROLLABLE)
local function image(name, x, y)
    return root:Image { src = SCRIPT_PATH .. name .. '.rle', x = x, y = y }
end
image('title', 74, 18)
local button = image('install', 110, 372)
button:add_flag(lvgl.FLAG.CLICKABLE)
local status
local function show(name)
    if status then status:delete() end
    status = image(name, 35, 160)
end

-- Check the destination before reporting success; os.execute return values
-- are not assumed to match desktop Lua or POSIX shell conventions.
local function verify()
    local source = io.open(SCRIPT_PATH .. 'dic', 'rb')
    local destination = io.open(target, 'rb')
    if not source or not destination then
        if source then source:close() end
        if destination then destination:close() end
        return false
    end
    local total = 0
    local valid = true
    while true do
        local a = source:read(4096)
        local b = destination:read(4096)
        if a ~= b then valid = false break end
        if not a then break end
        total = total + #a
    end
    source:close()
    destination:close()
    return valid and total == expectedSize
end

local busy = false
local stage = 0
local timer
timer = lvgl.Timer {
    period = 1000, paused = true,
    cb = function()
        local ok, result = pcall(function()
            if stage == 0 then
                os.execute('mkdir -p ' .. directory)
            elseif stage == 1 then
                os.execute('cp "' .. SCRIPT_PATH .. 'dic" "' .. target .. '"')
            else
                return verify()
            end
        end)
        if not ok or stage == 2 then
            timer:pause()
            busy = false
            show(ok and result and 'success' or 'error')
        else
            stage = stage + 1
        end
    end
}
button:onevent(lvgl.EVENT.SHORT_CLICKED, function()
    if busy then return end
    busy = true
    stage = 0
    show('runing')
    timer:resume()
end)
