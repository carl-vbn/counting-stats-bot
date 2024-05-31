from PIL import Image, ImageDraw, ImageFont
from math import pi, cos, sin, atan2, sqrt
from random import uniform
import csv
import sys

IMAGE_WIDTH = 1024
IMAGE_HEIGHT = 768
PIE_INNER_RADIUS = 150
PIE_OUTER_RADIUS = 280
PIE_GLOW_WIDTH = 2
PIE_GLOW_COLOR = (255, 255, 255)
BACKGROUND_BOTTOM = (0, 0, 0)
BACKGROUND_TOP = (20, 0, 80)
TEXT_COLOR = (255, 255, 255)
PIE_COLORS = [(255, 0, 100), (0, 255, 100), (0, 100, 255), (255, 0, 255), (0, 200, 255), (255, 100, 0)]
TITLE_FONT = ImageFont.truetype("fonts/Roboto-Medium.ttf", 24)
VALUE_FONT = ImageFont.truetype("fonts/Roboto-Condensed.ttf", 22)

PIE_INNER_RADIUS2 = PIE_INNER_RADIUS ** 2
PIE_OUTER_RADIUS2 = PIE_OUTER_RADIUS ** 2

# Load data
data = [(row[0],float(row[1])) for row in csv.reader(open(sys.argv[1]))]

# Normalize data
total = sum([value for _, value in data])
data = [(label, value / total) for label, value in data]

# Create image
image = Image.new("RGB", (IMAGE_WIDTH, IMAGE_HEIGHT), (255, 255, 255))
draw = ImageDraw.Draw(image)

pie_slices = [] # (data_index, start_angle, end_angle)
start_angle = 0
for i, (_, value) in enumerate(data):
    end_angle = start_angle + value * 2 * pi
    pie_slices.append((i, start_angle, end_angle))
    start_angle = end_angle

def get_background_color(x, y):
    return (
        int(BACKGROUND_TOP[0] + (BACKGROUND_BOTTOM[0] - BACKGROUND_TOP[0]) * y / IMAGE_HEIGHT),
        int(BACKGROUND_TOP[1] + (BACKGROUND_BOTTOM[1] - BACKGROUND_TOP[1]) * y / IMAGE_HEIGHT),
        int(BACKGROUND_TOP[2] + (BACKGROUND_BOTTOM[2] - BACKGROUND_TOP[2]) * y / IMAGE_HEIGHT)
    )
    
def lerp(a, b, t):
    return a + (b - a) * t

def lerp3d(a, b, t):
    return (
        int(lerp(a[0], b[0], t)),
        int(lerp(a[1], b[1], t)),
        int(lerp(a[2], b[2], t))
    )

def get_pie_color(x, y):
    r2 = (x - IMAGE_WIDTH // 2) ** 2 + (y - IMAGE_HEIGHT // 2) ** 2
    a = atan2(y - IMAGE_HEIGHT // 2, x - IMAGE_WIDTH // 2) + pi
    
    bg_color = get_background_color(x, y)
    
    if r2 < PIE_INNER_RADIUS2 or r2 > PIE_OUTER_RADIUS2:
        return get_background_color(x, y)
    elif r2 < PIE_OUTER_RADIUS2:
        slice = None
        for pie_slice in pie_slices:
            if a >= pie_slice[1] and a <= pie_slice[2]:
                slice = pie_slice
                break
            
        if slice[0] is not None:
            r = sqrt(r2)
            t1 = (r2 - PIE_INNER_RADIUS2) / (PIE_OUTER_RADIUS2 - PIE_INNER_RADIUS2)
            t2 = (a - slice[1]) / (slice[2] - slice[1])
            on_edge = r > PIE_OUTER_RADIUS - 2 or r < PIE_INNER_RADIUS + 2 or abs(a - slice[1]) < 0.01 or abs(a - slice[2]) < 0.01
            opacity = lerp(0.0, 0.6, (t1 + t2) / 2) if not on_edge else 1
            return lerp3d(bg_color, PIE_COLORS[slice[0] % len(PIE_COLORS)], opacity)
        
    return bg_color

# Draw the background and pie
for x in range(IMAGE_WIDTH):
    for y in range(IMAGE_HEIGHT):
        image.putpixel((x, y), get_pie_color(x, y))

# Draw title
title = "TOP COUNTERS"
_, _, width, height = draw.textbbox((0, 0), title, font=TITLE_FONT)
draw.text((IMAGE_WIDTH // 2 - width // 2, 30), title, font=TITLE_FONT, fill=TEXT_COLOR)

# Draw values inside pie
for i, (label, value) in enumerate(data):
    angle = (pie_slices[i][1] + pie_slices[i][2]) / 2 + pi
    x = IMAGE_WIDTH // 2 + cos(angle) * (PIE_INNER_RADIUS + (PIE_OUTER_RADIUS - PIE_INNER_RADIUS) / 2) - 20
    y = IMAGE_HEIGHT // 2 + sin(angle) * (PIE_INNER_RADIUS + (PIE_OUTER_RADIUS - PIE_INNER_RADIUS) / 2) - 10
    draw.text((x, y), f"{round(value * 100, 2)}%", font=VALUE_FONT, fill=TEXT_COLOR)

# Draw legend
x = IMAGE_WIDTH // 2 + PIE_OUTER_RADIUS + 20
y = IMAGE_HEIGHT // 2 - len(data) * 10
for label, value in data:
    draw.rectangle([x, y, x + 10, y + 10], fill=PIE_COLORS[data.index((label, value)) % len(PIE_COLORS)])
    draw.text((x + 20, y - 7), label, font=VALUE_FONT, fill=TEXT_COLOR)
    y += 40

# Save image
image.save(sys.argv[2])