from PIL import Image, ImageDraw, ImageFont
import colorsys
from datetime import datetime

# Properties
CURVE_LINE_WIDTH = 2
CURVE_GRADIENT_OPACITY_FACTOR = 0.8
AXIS_LINE_WIDTH = 1
GRID_LINE_WIDTH = 1

# Fonts
TITLE_FONT = ImageFont.truetype("fonts/Roboto-Medium.ttf", 20)
VALUE_FONT = ImageFont.truetype("fonts/Roboto-Condensed.ttf", 14)

# Constants
MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30 ,31, 30, 31]
DAY_LENGTH_MS = 24 * 60 * 60 * 1000
MONTH_LENGTH_MS = int(30.5 * 24 * 60 * 60 * 1000)

def lerp(a, b, t):
    return a + (b - a) * t

def lerp3d(a, b, t):
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t))

def int3d(v):
    return (int(v[0]), int(v[1]), int(v[2]))

def inv_lerp(a, b, v):
    return (v - a) / (b - a)

class Curve:
    def __init__(self, points) -> None:
        self.points = sorted(points, key=lambda x: x[0])
        self.fixed_min_y = None
        self.fixed_max_y = None

    def get_val(self, x):
        if x < self.points[0][0]:
            return self.points[0][1]
        if x > self.points[-1][0]:
            return self.points[-1][1]
        for i in range(len(self.points) - 1):
            if self.points[i][0] <= x <= self.points[i + 1][0]:
                return self.points[i][1] + (self.points[i + 1][1] - self.points[i][1]) * (x - self.points[i][0]) / (self.points[i + 1][0] - self.points[i][0])

    def get_min(self):
        if self.fixed_min_y is not None:
            return self.fixed_min_y

        min = None
        for point in self.points:
            if min is None or point[1] < min:
                min = point[1]

        return min

    def get_max(self):
        if self.fixed_max_y is not None:
            return self.fixed_max_y

        max = None
        for point in self.points:
            if max is None or point[1] > max:
                max = point[1]

        return max
    
    def fix_min_y(self, min_y):
        self.fixed_min_y = min_y
    
    def fix_max_y(self, max_y):
        self.fixed_max_y = max_y

    # t is a value between 0 and 1, and this function also returns a value between 0 and 1
    def get_curve_height(self, t):
        return inv_lerp(self.get_min(), self.get_max(), self.get_val(lerp(self.points[0][0], self.points[-1][0], t)))
    

def load_curve(filename, separator):
    with open(filename, "r") as f:
        points = []
        for line in f.readlines():
            if line.startswith("#") or len(line.strip()) == 0:
                continue
            x, y = line.split(separator)
            points.append((float(x), float(y)))
        return Curve(points)

def generate_image(curve, width, height, padding, color):
    '''Generates an image of a curve
    curve is a Curve object
    width and height are the dimensions of the image
    padding is the amount of pixels to leave around the graph on the image
    color is the color of the graph
    '''

    img = Image.new("RGB", (width, height), (0,0,0))
    pixels = img.load()

    curve_color_hsv = colorsys.rgb_to_hsv(color[0] / 255, color[1] / 255, color[2] / 255)
    background_color_a = (curve_color_hsv[0], curve_color_hsv[1] * 0.9, curve_color_hsv[2] * 0.3)
    background_color_b = ((curve_color_hsv[0]+0.01)%1, curve_color_hsv[1] * 0.9, curve_color_hsv[2] * 0.1)
    def get_background_color(x, y, on_grid_line=False):
        t = y / height


        hsv_color = lerp3d(background_color_a, background_color_b, t)

        if on_grid_line:
            hsv_color = (hsv_color[0], hsv_color[1], hsv_color[2] + 0.2)

        rgb_color = colorsys.hsv_to_rgb(hsv_color[0], hsv_color[1], hsv_color[2])
        return (int(rgb_color[0] * 255), int(rgb_color[1] * 255), int(rgb_color[2] * 255))


    def draw_line(p1, p2, color, line_width):
        distance = ((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2) ** 0.5
        for i in range(int(distance)):
            t = i / distance
            x = int(lerp(p1[0], p2[0], t))
            y = int(lerp(p1[1], p2[1], t))

            for x_offset in range(-line_width // 2, line_width // 2 + 1):
                for y_offset in range(-line_width // 2, line_width // 2 + 1):
                    if 0 <= x + x_offset < width and 0 <= y + y_offset < height:
                        pixels[x + x_offset, y + y_offset] = color

    # Draw background to the left of the curve
    for x in range(padding+1):
        for y in range(height):
            pixels[x, y] = get_background_color(x, y)

    # Draw background to the right of the curve
    for x in range(width-padding, width):
        for y in range(height):
            pixels[x, y] = get_background_color(x, y)

    # Find the offset before a month starts
    first_timestamp = curve.points[0][0]
    first_date = datetime.fromtimestamp(first_timestamp/1000)

    # Number of months displayed on the graph
    num_months = (curve.points[-1][0] - curve.points[0][0]) / MONTH_LENGTH_MS
    
    # Offset in milliseconds from the start of the month
    offset = datetime(first_date.year, first_date.month+1, 1).timestamp() * 1000 - first_timestamp

    # Width of a month on the x axis in pixels
    month_width_pixels = (width - 2 * padding) / num_months
    milliseconds_per_pixel = (curve.points[-1][0] - curve.points[0][0]) / (width - 2 * padding)
    offset_pixels = int(offset / milliseconds_per_pixel)
    month_width_pixels = int(month_width_pixels)
    print(first_timestamp, offset, offset_pixels)
    
    # Draw curve and gradient
    for x in range(padding+1, width-padding+1):
        t = inv_lerp(padding, width - padding, x)
        previous_t = inv_lerp(padding, width - padding, x - 1)

        curve_y = height - lerp(padding, height - padding, curve.get_curve_height(t))
        previous_curve_y = height - lerp(padding, height - padding, curve.get_curve_height(previous_t))

        # Draw gradient below the curve and background
        for y in range(height):
            on_grid_line = padding < y < height-padding and (y % 100 == padding or x % month_width_pixels == padding + offset_pixels)
            if int(curve_y) <= y < height-padding:
                pixels[x, y] = int3d(lerp3d(get_background_color(x, y, on_grid_line), color, CURVE_GRADIENT_OPACITY_FACTOR*inv_lerp(height-padding, padding, y)))
            else:
                pixels[x, y] = get_background_color(x, y, on_grid_line)

        # Draw curve
        draw_line((x, curve_y), (x - 1, previous_curve_y), color, CURVE_LINE_WIDTH)

    # Draw axes
    draw_line((padding, height - padding), (width - padding, height - padding), (255, 255, 255), AXIS_LINE_WIDTH)
    draw_line((padding, padding), (padding, height - padding), (255, 255, 255), AXIS_LINE_WIDTH)

    draw = ImageDraw.Draw(img)

    # Draw minimum y value
    min_y = curve.get_min()
    draw.text((padding - 10, height - padding), str(min_y), (255, 255, 255), font=VALUE_FONT, align="right", anchor="rb")

    # Draw maximum y value
    max_y = curve.get_max()
    draw.text((padding - 10, padding), str(max_y), (255, 255, 255), font=VALUE_FONT, align="right", anchor="rt")

    # Draw months on x axis

    x = padding + offset_pixels + 1
    last_month = None
    while x <= width - padding:
        t = inv_lerp(padding, width - padding, x)
        timestamp = curve.points[0][0] + (curve.points[-1][0] - curve.points[0][0]) * t
        date = datetime.fromtimestamp(timestamp/1000)

        if date.month != last_month:
            draw.text((x, height - padding + 10), MONTHS[date.month]+" "+str(date.year), (255, 255, 255), font=VALUE_FONT, align="center", anchor="mt")

            last_month = date.month

        x += 1

    # Draw title
    title = "COLUMBIA COUNTING"
    draw.text((padding, padding - 35), title, (255, 255, 255), font=TITLE_FONT)
    
            
    return img

def test():
    curve = load_curve("counting3.csv", ",")
    curve.fix_min_y(0)
    curve.fix_max_y(1000)
    img = generate_image(curve, 2000, 500, 50, (255, 0, 0))
    img.save("graph.png")

test()