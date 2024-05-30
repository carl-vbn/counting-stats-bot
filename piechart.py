from PIL import Image, ImageDraw, ImageFont

IMAGE_WIDTH = 800
IMAGE_HEIGHT = 600
PIE_INNER_RADIUS = 100
PIE_OUTER_RADIUS = 200
PIE_GLOW_WIDTH = 2
PIE_GLOW_COLOR = (255, 255, 255)
BACKGROUND_BOTTOM = (0, 0, 0)
BACKGROUND_TOP = (20, 0, 80)
TEXT_COLOR = (255, 255, 255)
PIE_COLORS = [(255, 0, 100), (0, 255, 100), (0, 100, 255), (255, 0, 255), (0, 200, 255), (255, 100, 0)]
TITLE_FONT = ImageFont.truetype("fonts/Roboto-Medium.ttf", 20)
VALUE_FONT = ImageFont.truetype("fonts/Roboto-Condensed.ttf", 14)

# Dummy data
data = [
    ("A", 30),
    ("B", 20),
    ("C", 10),
    ("D", 40),
    ("E", 15),
    ("F", 25)
]

# Create image
image = Image.new("RGB", (IMAGE_WIDTH, IMAGE_HEIGHT), (255, 255, 255))
draw = ImageDraw.Draw(image)

# Draw background gradient
for y in range(IMAGE_HEIGHT):
    color = (
        int(BACKGROUND_TOP[0] + (BACKGROUND_BOTTOM[0] - BACKGROUND_TOP[0]) * y / IMAGE_HEIGHT),
        int(BACKGROUND_TOP[1] + (BACKGROUND_BOTTOM[1] - BACKGROUND_TOP[1]) * y / IMAGE_HEIGHT),
        int(BACKGROUND_TOP[2] + (BACKGROUND_BOTTOM[2] - BACKGROUND_TOP[2]) * y / IMAGE_HEIGHT)
    )
    draw.line([(0, y), (IMAGE_WIDTH, y)], fill=color)

# Draw pie chart glow
draw.pieslice([IMAGE_WIDTH // 2 - PIE_OUTER_RADIUS - PIE_GLOW_WIDTH, IMAGE_HEIGHT // 2 - PIE_OUTER_RADIUS - PIE_GLOW_WIDTH, IMAGE_WIDTH // 2 + PIE_OUTER_RADIUS + PIE_GLOW_WIDTH, IMAGE_HEIGHT // 2 + PIE_OUTER_RADIUS + PIE_GLOW_WIDTH], 0, 360, fill=PIE_GLOW_COLOR)

# Draw pie chart
start_angle = 0
i = 0
for label, value in data:
    end_angle = start_angle + (value / 100) * 360
    draw.pieslice([IMAGE_WIDTH // 2 - PIE_OUTER_RADIUS, IMAGE_HEIGHT // 2 - PIE_OUTER_RADIUS, IMAGE_WIDTH // 2 + PIE_OUTER_RADIUS, IMAGE_HEIGHT // 2 + PIE_OUTER_RADIUS], start_angle, end_angle, fill=PIE_COLORS[i % len(PIE_COLORS)])
    start_angle = end_angle
    i += 1

# Draw title
title = "TOP COUNTERS"
x, y, title_width, title_height = draw.textbbox((IMAGE_WIDTH // 2 - 100, 20), title, font=TITLE_FONT)
draw.text((IMAGE_WIDTH // 2 - title_width // 2, 20), title, font=TITLE_FONT, fill=TEXT_COLOR)

# Draw values
x = IMAGE_WIDTH // 2 + PIE_OUTER_RADIUS + 20
y = IMAGE_HEIGHT // 2 - len(data) * 10
for label, value in data:
    draw.rectangle([x, y, x + 10, y + 10], fill=PIE_COLORS.pop(0))
    draw.text((x + 20, y - 2), f"{label} ({value}%)", font=VALUE_FONT, fill=TEXT_COLOR)
    y += 20

# Save image
image.save("piechart.png")