--[[
	Classic Valley – Map-Generator für Roblox Studio

	Benutzung:
	  1. Roblox Studio öffnen (leeres "Baseplate"-Template, Baseplate löschen)
	  2. Ansicht > Befehlsleiste (View > Command Bar) einblenden
	  3. Diesen ganzen Code einfügen und Enter drücken
	     (oder als Script in ServerScriptService legen und einmal Play drücken,
	      dann den erzeugten "ClassicValley"-Ordner kopieren und im Edit-Modus einfügen)

	Erneut ausführen ersetzt die alte Map.
]]

local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")
local StarterGui = game:GetService("StarterGui")
local Terrain = Workspace.Terrain

local old = Workspace:FindFirstChild("ClassicValley")
if old then old:Destroy() end

local map = Instance.new("Folder")
map.Name = "ClassicValley"
map.Parent = Workspace

local rng = Random.new(42)

-- Farben
local C = {
	grass      = Color3.fromRGB(75, 151, 75),
	grassLight = Color3.fromRGB(98, 186, 70),
	field      = Color3.fromRGB(52, 175, 60),
	stone      = Color3.fromRGB(140, 140, 140),
	stoneDark  = Color3.fromRGB(105, 105, 110),
	plaza      = Color3.fromRGB(163, 162, 165),
	wood       = Color3.fromRGB(124, 82, 46),
	leaves     = Color3.fromRGB(58, 138, 52),
	white      = Color3.fromRGB(245, 245, 245),
	orange     = Color3.fromRGB(240, 145, 40),
	blue       = Color3.fromRGB(40, 130, 230),
	red        = Color3.fromRGB(220, 40, 40),
	gold       = Color3.fromRGB(245, 190, 40),
	black      = Color3.fromRGB(25, 25, 30),
	signBlue   = Color3.fromRGB(30, 50, 80),
	waterfall  = Color3.fromRGB(150, 210, 255),
}

---------------------------------------------------------------------------
-- Helfer
---------------------------------------------------------------------------
local function part(props)
	local p = Instance.new(props.Class or "Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Material = props.Material or Enum.Material.SmoothPlastic
	p.Color = props.Color or C.stone
	p.Size = props.Size
	p.CFrame = props.CFrame
	if props.Shape then p.Shape = props.Shape end
	if props.Transparency then p.Transparency = props.Transparency end
	if props.Studs then p.TopSurface = Enum.SurfaceType.Studs end
	if props.CanCollide ~= nil then p.CanCollide = props.CanCollide end
	p.Name = props.Name or "Part"
	p.Parent = props.Parent or map
	return p
end

local function folder(name, parent)
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent or map
	return f
end

local function surfaceText(target, face, text, color, font)
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 40
	gui.Parent = target
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextScaled = true
	label.TextColor3 = color or C.white
	label.Font = font or Enum.Font.FredokaOne
	label.Parent = gui
	return gui, label
end

local function tree(pos, scale, parent)
	scale = scale or 1
	local m = Instance.new("Model")
	m.Name = "Tree"
	m.Parent = parent or map
	local trunkH = 6 * scale
	part({ Name = "Trunk", Parent = m, Color = C.wood, Material = Enum.Material.Wood,
		Size = Vector3.new(1.6, trunkH, 1.6) * Vector3.new(scale, 1, scale),
		CFrame = CFrame.new(pos + Vector3.new(0, trunkH / 2, 0)) })
	local s = 6 * scale
	part({ Name = "Leaves", Parent = m, Color = C.leaves, Material = Enum.Material.Grass,
		Size = Vector3.new(s, s, s),
		CFrame = CFrame.new(pos + Vector3.new(0, trunkH + s / 2 - 0.5, 0)) })
	part({ Name = "LeavesTop", Parent = m, Color = C.grassLight, Material = Enum.Material.Grass,
		Size = Vector3.new(s * 0.6, s * 0.5, s * 0.6),
		CFrame = CFrame.new(pos + Vector3.new(0, trunkH + s + s * 0.25 - 0.5, 0)) })
	return m
end

-- Block mit Steinkörper und Grasdeckel (Minecraft-artige Klippe)
local function grassBlock(center, size, parent)
	local top = center.Y + size.Y / 2
	part({ Name = "Rock", Parent = parent, Color = C.stone, Material = Enum.Material.Slate,
		Size = size, CFrame = CFrame.new(center) })
	part({ Name = "GrassTop", Parent = parent, Color = C.grass, Material = Enum.Material.Grass,
		Size = Vector3.new(size.X + 0.2, 1.5, size.Z + 0.2),
		CFrame = CFrame.new(center.X, top + 0.25, center.Z) })
	return top + 1
end

---------------------------------------------------------------------------
-- Licht / Himmel
---------------------------------------------------------------------------
Lighting.ClockTime = 13
Lighting.Brightness = 2.5
Lighting.OutdoorAmbient = Color3.fromRGB(150, 150, 160)
Lighting.GlobalShadows = true
if not Lighting:FindFirstChildOfClass("Atmosphere") then
	local atm = Instance.new("Atmosphere")
	atm.Density = 0.25
	atm.Haze = 0.5
	atm.Color = Color3.fromRGB(200, 225, 255)
	atm.Parent = Lighting
end

---------------------------------------------------------------------------
-- Wasser (Terrain)
---------------------------------------------------------------------------
Terrain:FillBlock(CFrame.new(0, -20, -60), Vector3.new(900, 8, 800), Enum.Material.Sand)
Terrain:FillBlock(CFrame.new(0, -9, -60), Vector3.new(900, 14, 800), Enum.Material.Water)
Terrain.WaterColor = Color3.fromRGB(30, 140, 220)
Terrain.WaterTransparency = 0.4
Terrain.WaterWaveSize = 0.15

---------------------------------------------------------------------------
-- Lobby-Insel mit Plaza
---------------------------------------------------------------------------
local lobby = folder("Lobby")

part({ Name = "LobbyGround", Parent = lobby, Color = C.grassLight, Material = Enum.Material.Grass,
	Size = Vector3.new(320, 18, 170), CFrame = CFrame.new(0, -9, 75), Studs = true })

part({ Name = "Plaza", Parent = lobby, Color = C.plaza, Material = Enum.Material.SmoothPlastic,
	Size = Vector3.new(150, 1, 100), CFrame = CFrame.new(0, 0.5, 70), Studs = true })
-- Weg zur Wasserkante
part({ Name = "PlazaPath", Parent = lobby, Color = C.plaza, Studs = true,
	Size = Vector3.new(60, 1, 30), CFrame = CFrame.new(0, 0.5, 8) })

local spawn = Instance.new("SpawnLocation")
spawn.Name = "LobbySpawn"
spawn.Anchored = true
spawn.Size = Vector3.new(10, 1, 10)
spawn.CFrame = CFrame.new(0, 1.1, 100)
spawn.Color = C.plaza
spawn.Transparency = 1
spawn.CanCollide = false
spawn.Neutral = true
spawn.Parent = lobby
local decal = spawn:FindFirstChildOfClass("Decal")
if decal then decal:Destroy() end

-- Blockige Hügel links und rechts
local hills = folder("Hills", lobby)
for _, side in ipairs({ -1, 1 }) do
	for col = 0, 2 do
		for row = 0, 13 do
			local x = side * (128 + col * 11)
			local z = 10 + row * 11
			local h = 4 + col * 6 + rng:NextInteger(0, 10)
			local top = grassBlock(Vector3.new(x, h / 2, z), Vector3.new(11, h, 11), hills)
			if rng:NextNumber() < 0.35 then
				tree(Vector3.new(x, top - 1, z), rng:NextNumber(0.8, 1.3), hills)
			end
		end
	end
end
-- Ein paar Bäume auf der Wiese
for _, p in ipairs({ Vector3.new(-100, 0, 30), Vector3.new(-105, 0, 120), Vector3.new(100, 0, 135),
	Vector3.new(-85, 0, 140), Vector3.new(90, 0, 15) }) do
	tree(p, 1.1, hills)
end

---------------------------------------------------------------------------
-- Shop
---------------------------------------------------------------------------
local function buildShop(cf)
	local m = Instance.new("Model")
	m.Name = "Shop"
	m.Parent = lobby
	local function rel(name, size, offset, color, mat)
		return part({ Name = name, Parent = m, Size = size, CFrame = cf * offset,
			Color = color, Material = mat or Enum.Material.SmoothPlastic })
	end
	rel("Floor", Vector3.new(18, 1, 12), CFrame.new(0, 1.5, 0), C.wood, Enum.Material.WoodPlanks)
	rel("BackWall", Vector3.new(18, 10, 1), CFrame.new(0, 7, 5.5), C.orange)
	rel("SideL", Vector3.new(1, 10, 12), CFrame.new(-8.5, 7, 0), C.orange)
	rel("SideR", Vector3.new(1, 10, 12), CFrame.new(8.5, 7, 0), C.orange)
	rel("Counter", Vector3.new(16, 4, 2), CFrame.new(0, 4, -5), C.orange)
	rel("CounterTop", Vector3.new(17, 0.5, 2.6), CFrame.new(0, 6.25, -5), C.wood, Enum.Material.Wood)
	-- Gestreiftes Vordach
	for i = 0, 8 do
		rel("Awning", Vector3.new(2, 0.6, 14), CFrame.new(-8 + i * 2, 12.5, -2) * CFrame.Angles(math.rad(-12), 0, 0),
			(i % 2 == 0) and C.blue or C.white)
	end
	-- Kisten im Laden
	rel("Crate1", Vector3.new(3, 3, 3), CFrame.new(-5, 3.5, 3), C.wood, Enum.Material.WoodPlanks)
	rel("Crate2", Vector3.new(2.5, 2.5, 2.5), CFrame.new(5, 3.25, 3), C.wood, Enum.Material.WoodPlanks)
	local sign = rel("Sign", Vector3.new(16, 4.5, 1), CFrame.new(0, 15.5, -4) * CFrame.Angles(math.rad(-10), 0, 0), C.orange)
	surfaceText(sign, Enum.NormalId.Front, "SHOP", C.white)

	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "ShopPrompt"
	prompt.ActionText = "Shop öffnen"
	prompt.ObjectText = "Shop"
	prompt.MaxActivationDistance = 12
	prompt.Parent = m:FindFirstChild("Counter")
end
buildShop(CFrame.lookAt(Vector3.new(-55, 0, 75), Vector3.new(0, 0, 55)))

---------------------------------------------------------------------------
-- Truhen (rot, blau, gold)
---------------------------------------------------------------------------
local chests = folder("Chests", lobby)
local function buildChest(name, pos, color)
	local m = Instance.new("Model")
	m.Name = name
	m.Parent = chests
	local disc = CFrame.Angles(0, 0, math.rad(90))
	part({ Name = "Glow", Parent = m, Shape = Enum.PartType.Cylinder, Material = Enum.Material.Neon,
		Color = color, Size = Vector3.new(0.6, 14, 14), CFrame = CFrame.new(pos + Vector3.new(0, 1.3, 0)) * disc })
	part({ Name = "Pedestal", Parent = m, Shape = Enum.PartType.Cylinder, Color = C.black,
		Size = Vector3.new(1.2, 12.5, 12.5), CFrame = CFrame.new(pos + Vector3.new(0, 1.8, 0)) * disc })
	local base = pos.Y + 2.4
	local body = part({ Name = "Body", Parent = m, Color = color, Material = Enum.Material.SmoothPlastic,
		Size = Vector3.new(6, 3.5, 4), CFrame = CFrame.new(pos.X, base + 1.75, pos.Z) })
	part({ Name = "Lid", Parent = m, Color = color:Lerp(Color3.new(1, 1, 1), 0.15),
		Size = Vector3.new(6.2, 1.6, 4.2), CFrame = CFrame.new(pos.X, base + 4.3, pos.Z) })
	for _, x in ipairs({ -2, 2 }) do
		part({ Name = "Band", Parent = m, Color = C.gold, Material = Enum.Material.Metal,
			Size = Vector3.new(0.5, 5.3, 4.4), CFrame = CFrame.new(pos.X + x, base + 2.65, pos.Z) })
	end
	part({ Name = "Lock", Parent = m, Color = C.gold, Material = Enum.Material.Metal,
		Size = Vector3.new(1.2, 1.4, 0.5), CFrame = CFrame.new(pos.X, base + 3.4, pos.Z + 2.3) })

	local light = Instance.new("PointLight")
	light.Color = color
	light.Range = 14
	light.Brightness = 2
	light.Parent = body

	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Öffnen"
	prompt.ObjectText = name
	prompt.MaxActivationDistance = 10
	prompt.Parent = body
end
buildChest("RedChest",  Vector3.new(-22, 0, 40), C.red)
buildChest("BlueChest", Vector3.new(0, 0, 40),   C.blue)
buildChest("GoldChest", Vector3.new(22, 0, 40),  C.gold)

---------------------------------------------------------------------------
-- Leaderboards
---------------------------------------------------------------------------
local boards = folder("Leaderboards", lobby)
local function buildBoard(name, title, entries, pos)
	local cf = CFrame.lookAt(pos, Vector3.new(0, pos.Y, 70))
	local m = Instance.new("Model")
	m.Name = name
	m.Parent = boards
	for _, x in ipairs({ -6.5, 6.5 }) do
		part({ Name = "Post", Parent = m, Color = C.wood, Material = Enum.Material.Wood,
			Size = Vector3.new(1, 16, 1), CFrame = cf * CFrame.new(x, 8, 0.6) })
	end
	part({ Name = "Frame", Parent = m, Color = C.wood, Material = Enum.Material.Wood,
		Size = Vector3.new(13, 12, 0.4), CFrame = cf * CFrame.new(0, 10, 0.3) })
	local board = part({ Name = "Board", Parent = m, Color = C.black,
		Size = Vector3.new(12, 11, 0.4), CFrame = cf * CFrame.new(0, 10, 0) })

	local gui = Instance.new("SurfaceGui")
	gui.Name = "BoardGui"
	gui.Face = Enum.NormalId.Front
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 40
	gui.Parent = board
	local pad = Instance.new("UIPadding")
	pad.PaddingLeft = UDim.new(0.06, 0)
	pad.PaddingTop = UDim.new(0.04, 0)
	pad.Parent = gui
	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Parent = gui

	local function line(text, color, h, order)
		local l = Instance.new("TextLabel")
		l.Name = "Line" .. order
		l.LayoutOrder = order
		l.BackgroundTransparency = 1
		l.Size = UDim2.fromScale(0.94, h)
		l.Text = text
		l.TextScaled = true
		l.TextXAlignment = Enum.TextXAlignment.Left
		l.TextColor3 = color
		l.Font = Enum.Font.FredokaOne
		l.Parent = gui
	end
	line(title, Color3.fromRGB(80, 220, 255), 0.2, 0)
	for i, e in ipairs(entries) do
		line(("#%d  %s   %s"):format(i, e[1], e[2]), C.white, 0.14, i)
	end
end

buildBoard("TopWins", "TOP WINS",
	{ { "Player1", "4,327" }, { "Player2", "3,921" }, { "Player3", "3,507" }, { "Player4", "3,121" }, { "Player5", "2,975" } },
	Vector3.new(68, 0, 30))
buildBoard("TopLevel", "TOP LEVEL",
	{ { "Player1", "248" }, { "Player2", "231" }, { "Player3", "219" }, { "Player4", "204" }, { "Player5", "198" } },
	Vector3.new(75, 0, 55))
buildBoard("TopCatches", "TOP CATCHES",
	{ { "Player1", "1,347" }, { "Player2", "1,204" }, { "Player3", "1,093" }, { "Player4", "987" }, { "Player5", "942" } },
	Vector3.new(80, 0, 80))
buildBoard("TopCrossings", "TOP CROSSINGS",
	{ { "Player1", "3,887" }, { "Player2", "3,102" }, { "Player3", "2,760" }, { "Player4", "2,419" }, { "Player5", "2,173" } },
	Vector3.new(82, 0, 106))

---------------------------------------------------------------------------
-- Spielfeld-Insel
---------------------------------------------------------------------------
local arena = folder("Arena")
local FZ = -130            -- Feldmitte (Z)
local FW, FD = 260, 120    -- Feldbreite (X) und -tiefe (Z)

part({ Name = "Foundation", Parent = arena, Color = C.stoneDark, Material = Enum.Material.Slate,
	Size = Vector3.new(FW + 24, 16, FD + 24), CFrame = CFrame.new(0, -6, FZ) })
part({ Name = "Field", Parent = arena, Color = C.field, Material = Enum.Material.Grass,
	Size = Vector3.new(FW, 1, FD), CFrame = CFrame.new(0, 2.5, FZ) })

-- Mauern rundherum
local wallH, wallT = 4, 3
local ex, ez = (FW + 24) / 2 - wallT / 2, (FD + 24) / 2 - wallT / 2
part({ Name = "WallN", Parent = arena, Color = C.stone, Material = Enum.Material.Slate,
	Size = Vector3.new(FW + 24, wallH, wallT), CFrame = CFrame.new(0, 2 + wallH / 2, FZ - ez) })
part({ Name = "WallS", Parent = arena, Color = C.stone, Material = Enum.Material.Slate,
	Size = Vector3.new(FW + 24, wallH, wallT), CFrame = CFrame.new(0, 2 + wallH / 2, FZ + ez) })
part({ Name = "WallW", Parent = arena, Color = C.stone, Material = Enum.Material.Slate,
	Size = Vector3.new(wallT, wallH, FD + 24), CFrame = CFrame.new(-ex, 2 + wallH / 2, FZ) })
part({ Name = "WallE", Parent = arena, Color = C.stone, Material = Enum.Material.Slate,
	Size = Vector3.new(wallT, wallH, FD + 24), CFrame = CFrame.new(ex, 2 + wallH / 2, FZ) })

-- Ecktürme mit Lampen
for _, sx in ipairs({ -1, 1 }) do
	for _, sz in ipairs({ -1, 1 }) do
		local p = Vector3.new(sx * ex, 0, FZ + sz * ez)
		part({ Name = "Pillar", Parent = arena, Color = C.stone, Material = Enum.Material.Slate,
			Size = Vector3.new(6, 12, 6), CFrame = CFrame.new(p.X, 8, p.Z) })
		local lamp = part({ Name = "Lamp", Parent = arena, Color = Color3.fromRGB(255, 240, 200),
			Material = Enum.Material.Neon, Size = Vector3.new(3, 2, 3), CFrame = CFrame.new(p.X, 15, p.Z) })
		local l = Instance.new("PointLight")
		l.Range = 25
		l.Parent = lamp
	end
end

-- Linien
local lines = folder("Lines", arena)
local LY, LT = 3.05, 0.1
local function lineBox(size, pos)
	part({ Name = "Line", Parent = lines, Color = C.white, CanCollide = false,
		Size = Vector3.new(size.X, LT, size.Z), CFrame = CFrame.new(pos.X, LY, pos.Z) })
end
local hw, hd = FW / 2 - 6, FD / 2 - 6
lineBox(Vector3.new(hw * 2, 0, 1.2), Vector3.new(0, 0, FZ - hd))   -- Seitenlinie
lineBox(Vector3.new(hw * 2, 0, 1.2), Vector3.new(0, 0, FZ + hd))   -- Seitenlinie
lineBox(Vector3.new(1.2, 0, hd * 2), Vector3.new(-hw, 0, FZ))      -- Grundlinie
lineBox(Vector3.new(1.2, 0, hd * 2), Vector3.new(hw, 0, FZ))       -- Grundlinie
lineBox(Vector3.new(1.2, 0, hd * 2), Vector3.new(-hw + 28, 0, FZ)) -- Endzone
lineBox(Vector3.new(1.2, 0, hd * 2), Vector3.new(hw - 28, 0, FZ))  -- Endzone

-- "RUN"-Schriftzüge in den Endzonen
for _, side in ipairs({ -1, 1 }) do
	local x = side * (hw - 14)
	local txt = part({ Name = "RunText", Parent = arena, Transparency = 1, CanCollide = false,
		Size = Vector3.new(60, 0.1, 22),
		CFrame = CFrame.new(x, LY + 0.05, FZ) * CFrame.Angles(0, math.rad(90 * side), 0) })
	surfaceText(txt, Enum.NormalId.Top, "RUN", C.white)
end

-- Endzonen als Trigger (z.B. für "Crossings")
for _, side in ipairs({ -1, 1 }) do
	local zone = part({ Name = side < 0 and "EndZoneWest" or "EndZoneEast", Parent = arena,
		Transparency = 1, CanCollide = false, Size = Vector3.new(28, 10, hd * 2),
		CFrame = CFrame.new(side * (hw - 14), 8, FZ) })
	zone:SetAttribute("EndZone", true)
end

-- Brücke von der Lobby zum Feld
part({ Name = "Bridge", Parent = arena, Color = C.wood, Material = Enum.Material.WoodPlanks,
	Size = Vector3.new(16, 1, 70), CFrame = CFrame.new(0, 1.5, -26) })
for _, x in ipairs({ -8, 8 }) do
	part({ Name = "Rail", Parent = arena, Color = C.wood, Material = Enum.Material.Wood,
		Size = Vector3.new(0.6, 3, 70), CFrame = CFrame.new(x, 3.5, -26) })
end

---------------------------------------------------------------------------
-- Klippen im Hintergrund + Schild + Wasserfall
---------------------------------------------------------------------------
local cliffs = folder("Cliffs")
local CZ = -235
local x = -240
while x < 240 do
	local w = rng:NextInteger(18, 32)
	local h = rng:NextInteger(30, 60)
	if math.abs(x) < 50 then h = 45 end          -- Mitte: gleichmäßige Wand fürs Schild
	if x > 150 and x < 200 then h = 62 end        -- hoch genug für den Wasserfall
	local d = rng:NextInteger(40, 60)
	local top = grassBlock(Vector3.new(x + w / 2, h / 2 - 14, CZ - d / 2 + 30), Vector3.new(w, h, d), cliffs)
	-- Stufen davor
	if rng:NextNumber() < 0.5 then
		grassBlock(Vector3.new(x + w / 2, (h * 0.5) / 2 - 14, CZ + 30 + 6), Vector3.new(w * 0.6, h * 0.5, 12), cliffs)
	end
	for _ = 1, rng:NextInteger(1, 3) do
		tree(Vector3.new(x + rng:NextNumber(3, w - 3), top - 1, CZ + rng:NextNumber(-10, 20)), rng:NextNumber(0.9, 1.5), cliffs)
	end
	x += w
end

local sign = part({ Name = "BreakAnklesSign", Parent = cliffs, Color = C.signBlue,
	Size = Vector3.new(44, 16, 1), CFrame = CFrame.new(0, 14, CZ + 30.6) })
surfaceText(sign, Enum.NormalId.Back, "BREAK\nANKLES", C.white)

local fall = part({ Name = "Waterfall", Parent = cliffs, Color = C.waterfall, Material = Enum.Material.Glass,
	Transparency = 0.25, CanCollide = false, Size = Vector3.new(16, 62, 1.5),
	CFrame = CFrame.new(175, 17, CZ + 31) })
local mist = Instance.new("ParticleEmitter")
mist.Texture = "rbxasset://textures/particles/smoke_main.dds"
mist.Color = ColorSequence.new(Color3.new(1, 1, 1))
mist.Size = NumberSequence.new(4, 10)
mist.Transparency = NumberSequence.new(0.4, 1)
mist.Lifetime = NumberRange.new(1.5, 2.5)
mist.Rate = 25
mist.Speed = NumberRange.new(2, 5)
mist.EmissionDirection = Enum.NormalId.Back
local foam = part({ Name = "Foam", Parent = cliffs, Color = C.white, Material = Enum.Material.SmoothPlastic,
	Transparency = 0.3, CanCollide = false, Size = Vector3.new(22, 1, 8), CFrame = CFrame.new(175, -1.5, CZ + 35) })
mist.Parent = foam

---------------------------------------------------------------------------
-- Kleine Inseln im Wasser
---------------------------------------------------------------------------
local islands = folder("Islands")
for _, info in ipairs({
	{ Vector3.new(-230, 0, -150), 26 },
	{ Vector3.new(-190, 0, -30), 18 },
	{ Vector3.new(235, 0, -130), 24 },
	{ Vector3.new(200, 0, -20), 16 },
}) do
	local p, s = info[1], info[2]
	local top = grassBlock(Vector3.new(p.X, -4, p.Z), Vector3.new(s, 12, s), islands)
	tree(Vector3.new(p.X, top - 1, p.Z), 1.2, islands)
end

---------------------------------------------------------------------------
-- "CLASSIC VALLEY"-Titel oben links
---------------------------------------------------------------------------
local oldGui = StarterGui:FindFirstChild("ClassicValleyTitle")
if oldGui then oldGui:Destroy() end
local screen = Instance.new("ScreenGui")
screen.Name = "ClassicValleyTitle"
screen.ResetOnSpawn = false
local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(20, 10)
title.Size = UDim2.fromOffset(360, 50)
title.Text = "CLASSIC VALLEY"
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.TextColor3 = C.white
title.TextStrokeTransparency = 0.5
title.Font = Enum.Font.FredokaOne
title.Parent = screen
screen.Parent = StarterGui

print("Classic Valley Map erstellt!")
