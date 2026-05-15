"""Concierge routes — guided bouquet builder.

POST /concierge/generate accepts the user's quiz state (occasion, mood picks,
palette, flower kinds, message, format) and returns a preview image plus a
suggested curated bouquet and price.

If GEMINI_API_KEY is set (backend/.env, gitignored), this calls the Gemini
2.5 Flash Image model and returns the generated image as a base64 data URI.
If the key is missing or the API errors / rate-limits, it falls back to a
tag-similarity stub that picks the closest mood reference image.

The frontend treats both responses identically — it just renders preview_url.
"""

import os
import urllib.parse

import requests
from flask import Blueprint, jsonify, request

from db import query_one


bp = Blueprint("concierge", __name__)


# Mirror of frontend MOOD_REFS (lib/imagery.ts). Tags drive stub similarity.
MOOD_REFS = {
    "m-cottage": {"image_id": "1561181286-d3fee7d55364", "name": "Cottage rose",
                  "tags": {"palette": ["warm", "pastel"], "vibe": ["rustic", "romantic", "garden"], "shape": ["airy"]}},
    "m-ivory":   {"image_id": "1494972308805-463bc619d34e", "name": "Ivory linen",
                  "tags": {"palette": ["white", "monochrome"], "vibe": ["minimal", "luxe", "modern"], "shape": ["tight"]}},
    "m-blush":   {"image_id": "1565181917578-7180a32f8a7d", "name": "Blush peony",
                  "tags": {"palette": ["pastel", "warm"], "vibe": ["romantic", "luxe"], "shape": ["tight"]}},
    "m-tulip":   {"image_id": "1525310072745-f49212b5ac6d", "name": "Tulip market",
                  "tags": {"palette": ["pastel", "vivid"], "vibe": ["modern", "minimal"], "shape": ["tight"]}},
    "m-rusty":   {"image_id": "1606170033648-5d55a3edf314", "name": "Rusted garden",
                  "tags": {"palette": ["warm", "earth"], "vibe": ["rustic", "garden", "wild"], "shape": ["airy"]}},
    "m-red":     {"image_id": "1518895949257-7621c3c786d7", "name": "Red ribbon",
                  "tags": {"palette": ["vivid", "warm"], "vibe": ["romantic", "luxe"], "shape": ["tight"]}},
    "m-sun":     {"image_id": "1597848212624-a19eb35e2651", "name": "Sunfield",
                  "tags": {"palette": ["vivid", "warm"], "vibe": ["garden", "rustic"], "shape": ["airy"]}},
    "m-cloud":   {"image_id": "1487530811176-3780de880c2d", "name": "Cloud bouquet",
                  "tags": {"palette": ["white", "pastel"], "vibe": ["minimal", "romantic"], "shape": ["airy"]}},
    "m-line":    {"image_id": "1565011523534-747a8601f10a", "name": "Tropic line",
                  "tags": {"palette": ["cool", "white"], "vibe": ["minimal", "modern", "wild"], "shape": ["cascading"]}},
    "m-stem":    {"image_id": "1520763185298-1b434c919102", "name": "Single stem",
                  "tags": {"palette": ["monochrome", "vivid"], "vibe": ["minimal", "modern"], "shape": ["tight"]}},
    "m-leaf":    {"image_id": "1610847499832-918a1c3c6811", "name": "Leaf & pepper",
                  "tags": {"palette": ["cool", "earth"], "vibe": ["rustic", "minimal", "garden"], "shape": ["airy"]}},
    "m-petal":   {"image_id": "1496062031456-07b8f162a322", "name": "Petal pink",
                  "tags": {"palette": ["pastel", "cool"], "vibe": ["romantic", "minimal"], "shape": ["compact"]}},
    "m-jasmine": {"image_id": "1487530811176-3780de880c2d", "name": "Jasmine garland",
                  "tags": {"palette": ["white", "cool"], "vibe": ["minimal", "rustic"], "shape": ["cascading"]}},
    "m-marigold":{"image_id": "1606170033648-5d55a3edf314", "name": "Marigold offering",
                  "tags": {"palette": ["vivid", "warm"], "vibe": ["rustic", "wild"], "shape": ["tight"]}},
    "m-lotus":   {"image_id": "1565181917578-7180a32f8a7d", "name": "Lotus river",
                  "tags": {"palette": ["pastel", "cool"], "vibe": ["minimal", "luxe"], "shape": ["tight"]}},
    "m-orchid":  {"image_id": "1565011523534-747a8601f10a", "name": "Orchid hush",
                  "tags": {"palette": ["cool", "monochrome"], "vibe": ["luxe", "modern"], "shape": ["cascading"]}},
    "m-monsoon": {"image_id": "1610847499832-918a1c3c6811", "name": "Monsoon greens",
                  "tags": {"palette": ["cool", "earth"], "vibe": ["wild", "garden"], "shape": ["cascading"]}},
    "m-bridal":  {"image_id": "1494972308805-463bc619d34e", "name": "Bridal hand-tied",
                  "tags": {"palette": ["white", "pastel"], "vibe": ["luxe", "romantic", "minimal"], "shape": ["compact"]}},
    "m-night":   {"image_id": "1518895949257-7621c3c786d7", "name": "Midnight velvet",
                  "tags": {"palette": ["monochrome", "cool"], "vibe": ["luxe", "modern"], "shape": ["tight"]}},
    "m-pastel":  {"image_id": "1525310072745-f49212b5ac6d", "name": "Pastel meadow",
                  "tags": {"palette": ["pastel", "vivid"], "vibe": ["garden", "romantic"], "shape": ["airy"]}},
}

PALETTE_TAGS = {
    "blush":      {"label": "blush",      "swatches": ["#F5D7D2", "#E8B6B2", "#C58F87"], "tags": ["pastel", "warm"],       "premium": 0},
    "ivory":      {"label": "ivory",      "swatches": ["#F8F2E6", "#EADFC8", "#C9B998"], "tags": ["white", "warm"],        "premium": 40},
    "ember":      {"label": "ember",      "swatches": ["#E76F51", "#C73838", "#7A1F1F"], "tags": ["vivid", "warm"],        "premium": 100},
    "sage":       {"label": "sage",       "swatches": ["#C8D5BB", "#7A8B6C", "#3F5742"], "tags": ["cool", "earth"],        "premium": 60},
    "midnight":   {"label": "midnight",   "swatches": ["#5C3D7A", "#2C2333", "#A78AC9"], "tags": ["cool", "monochrome"],   "premium": 120},
    "spring":     {"label": "spring",     "swatches": ["#FFF2A8", "#FFBADD", "#9CD3E4"], "tags": ["pastel", "vivid"],      "premium": 60},
    "rosegold":   {"label": "rose gold",  "swatches": ["#F5D5C8", "#D9A48A", "#B8945D"], "tags": ["warm", "pastel"],       "premium": 90},
    "sunset":     {"label": "sunset",     "swatches": ["#FFB07A", "#F26A6A", "#9C3A50"], "tags": ["vivid", "warm"],        "premium": 90},
    "noir":       {"label": "noir",       "swatches": ["#1C1A17", "#3A2A2A", "#7A1F1F"], "tags": ["monochrome", "cool"],   "premium": 140},
    "jade":       {"label": "jade",       "swatches": ["#1E5F4D", "#62A48B", "#D5B65A"], "tags": ["cool", "earth"],        "premium": 100},
    "lilac":      {"label": "lilac",      "swatches": ["#D7C7E0", "#B89DCA", "#7E5E96"], "tags": ["pastel", "cool"],       "premium": 50},
    "terracotta": {"label": "terracotta", "swatches": ["#D89B7A", "#B05E3C", "#6F2E1A"], "tags": ["warm", "earth"],        "premium": 80},
    "peach":      {"label": "peach",      "swatches": ["#FFD9C0", "#FFAE8E", "#E08660"], "tags": ["pastel", "warm"],       "premium": 50},
    "lavender":   {"label": "lavender",   "swatches": ["#E0DAEC", "#B7A8D3", "#6F608F"], "tags": ["pastel", "cool"],       "premium": 50},
    "ocean":      {"label": "ocean",      "swatches": ["#CFE0E5", "#5C8C99", "#234A5B"], "tags": ["cool", "monochrome"],   "premium": 90},
    "butter":     {"label": "butter",     "swatches": ["#FCEFC1", "#F4D77A", "#C99E3A"], "tags": ["pastel", "warm"],       "premium": 50},
    "monsoon":    {"label": "monsoon",    "swatches": ["#7A8B6C", "#3F5742", "#222B26"], "tags": ["cool", "earth"],        "premium": 70},
    "temple":     {"label": "temple",     "swatches": ["#FFC857", "#E08020", "#8C4A12"], "tags": ["vivid", "warm"],        "premium": 80},
}

FORMAT_INFO = {
    "card":       {"label": "folded gift card",      "max": 140, "price_add": 60,
                   "wrap_descriptor": "cream kraft paper with a small folded gift card tied at the stems"},
    "wrap_stamp": {"label": "stamp on kraft paper",  "max":  18, "price_add": 40,
                   "wrap_descriptor": "kraft paper stamped with a short stamped word"},
    "ribbon":     {"label": "printed silk ribbon",   "max":  36, "price_add": 90,
                   "wrap_descriptor": "cream kraft paper with a silk ribbon printed with a single line"},
    "none":       {"label": "no message",            "max":   0, "price_add":  0,
                   "wrap_descriptor": "cream kraft paper, no card, no ribbon"},
}

OCCASION_BASE = {
    "anniversary":  1290,
    "apology":       990,
    "celebration":   890,
    "sympathy":     1190,
    "birthday":      950,
    "thank_you":     890,
    "just_because":  790,
    "graduation":   1090,
    "wedding":      1690,
    "newborn":      1090,
    "housewarming":  890,
    "get_well":      890,
    "farewell":      990,
    "other":         890,
}

CURATED_SUGGESTION = {
    "anniversary":  1,
    "apology":      2,
    "celebration":  3,
    "sympathy":     4,
    "birthday":     3,
    "thank_you":    1,
    "just_because": 1,
    "graduation":   3,
    "wedding":      1,
    "newborn":      2,
    "housewarming": 1,
    "get_well":     2,
    "farewell":     4,
    "other":        1,
}


def _aggregate_tags(mood_ids):
    bag = {"palette": {}, "vibe": {}, "shape": {}}
    for mid in mood_ids:
        ref = MOOD_REFS.get(mid)
        if not ref:
            continue
        for k in ("palette", "vibe", "shape"):
            for tag in ref["tags"][k]:
                bag[k][tag] = bag[k].get(tag, 0) + 1
    return bag


def _apply_palette(bag, palette_id):
    p = PALETTE_TAGS.get(palette_id)
    if not p:
        return bag
    for tag in p["tags"]:
        bag["palette"][tag] = bag["palette"].get(tag, 0) + 1
    return bag


def _score_ref(ref_id, bag):
    ref = MOOD_REFS[ref_id]
    score = 0
    for tag in ref["tags"]["palette"]:
        score += 2 * bag["palette"].get(tag, 0)
    for tag in ref["tags"]["vibe"]:
        score += 3 * bag["vibe"].get(tag, 0)
    for tag in ref["tags"]["shape"]:
        score += 1 * bag["shape"].get(tag, 0)
    return score


def _best_match(bag, exclude_ids):
    candidates = [k for k in MOOD_REFS.keys() if k not in exclude_ids]
    if not candidates:
        candidates = list(MOOD_REFS.keys())
    best, best_score = candidates[0], -1
    for rid in candidates:
        s = _score_ref(rid, bag)
        if s > best_score:
            best, best_score = rid, s
    return best


def _build_prompt(payload, palette, format_info):
    mood_names = [MOOD_REFS[m]["name"] for m in payload.get("mood_picks", []) if m in MOOD_REFS]
    mood_str = ", ".join(mood_names) if mood_names else "a thoughtful florist arrangement"
    flowers = payload.get("flower_kinds", []) or []
    flower_str = ", ".join(flowers) if flowers else "seasonal stems"
    occasion = payload.get("occasion", "just_because")
    occasion_text = (payload.get("occasion_text") or "").strip()
    if occasion == "other" and occasion_text:
        occasion_label = occasion_text
    else:
        occasion_label = occasion.replace("_", " ")
    palette_label = palette["label"] if palette else "soft natural"
    swatch_str = ", ".join(palette["swatches"]) if palette else ""
    wrap = format_info["wrap_descriptor"] if format_info else "cream kraft paper"
    notes = (payload.get("anything_else") or "").strip()

    prompt = (
        f"Photograph of a hand-tied bouquet for a {occasion_label} gift, inspired by "
        f"the moods of {mood_str}. The bouquet uses a {palette_label} palette "
        f"(hex tones: {swatch_str}) and features {flower_str}. It is wrapped "
        f"in {wrap}. Shot on a soft cream linen surface, 3/4 angle, natural "
        f"window light, shallow depth of field, editorial florist studio look, "
        f"no people, no visible text, no watermarks."
    )
    if notes:
        prompt += f" Florist note: {notes}."
    return prompt


def _call_gemini(prompt):
    api_key = os.environ.get("GEMINI_API_KEY")
    model   = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    if not api_key:
        return None, "no_key"
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    body = {
        "contents":         [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    try:
        r = requests.post(url, json=body, timeout=45)
        if r.status_code >= 400:
            return None, f"http_{r.status_code}"
        data = r.json()
        for cand in data.get("candidates", []):
            parts = cand.get("content", {}).get("parts", [])
            for part in parts:
                inline = part.get("inlineData") or part.get("inline_data")
                if inline and inline.get("data"):
                    mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                    return f"data:{mime};base64,{inline['data']}", None
        return None, "no_image"
    except requests.RequestException as exc:
        return None, f"net_{type(exc).__name__}"


def _pollinations_url(prompt, seed=42):
    """Pollinations.ai — free, no-auth image gen endpoint.

    Used as a live-AI fallback when Gemini is rate-limited / billing-disabled.
    Returns a hot-linkable URL; the frontend renders it directly via <Image>.
    """
    enc = urllib.parse.quote(prompt[:600], safe="")
    return (
        f"https://image.pollinations.ai/prompt/{enc}"
        f"?width=900&height=900&model=flux&nologo=true&seed={seed}"
    )


def _stub_preview_url(best_id):
    img = MOOD_REFS[best_id]["image_id"]
    return f"https://images.unsplash.com/photo-{img}?auto=format&fit=crop&w=900&q=80"


def _compute_price(payload, palette, format_info):
    occasion = payload.get("occasion", "just_because")
    base     = OCCASION_BASE.get(occasion, 890)
    flowers  = payload.get("flower_kinds", []) or []
    per_kind = 60 * len(flowers)
    palette_premium = palette["premium"] if palette else 0
    format_add      = format_info["price_add"] if format_info else 0
    return base + per_kind + palette_premium + format_add


def _truncate_message(msg, fmt_id):
    if not msg:
        return ""
    info = FORMAT_INFO.get(fmt_id) or {}
    cap = info.get("max", 0)
    if cap <= 0:
        return ""
    return msg[:cap]


@bp.post("/generate")
def generate():
    payload = request.get_json(silent=True) or {}

    mood_picks   = payload.get("mood_picks", []) or []
    palette_id   = payload.get("palette_id")
    format_id    = payload.get("format", "card")
    occasion     = payload.get("occasion", "just_because")
    message_in   = (payload.get("message") or "").strip()

    palette     = PALETTE_TAGS.get(palette_id) if palette_id else None
    format_info = FORMAT_INFO.get(format_id) or FORMAT_INFO["card"]

    # Tag similarity (used for fallback + for the human-readable summary)
    bag       = _aggregate_tags(mood_picks)
    bag       = _apply_palette(bag, palette_id) if palette_id else bag
    best_id   = _best_match(bag, exclude_ids=mood_picks)

    # Prompt + AI call. Order:
    #   1) Gemini 2.5 Flash Image (needs billing — currently 429 on free tier)
    #   2) Pollinations.ai free image-gen (no auth)
    #   3) Tag-similarity stub (best MoodRef image)
    prompt = _build_prompt(payload, palette, format_info)
    preview_url, err = _call_gemini(prompt)
    source = "gemini"
    if not preview_url:
        if os.environ.get("FLORIERE_USE_POLLINATIONS", "1") != "0":
            # Seed off the picked mood + occasion so repeats stay deterministic.
            seed = abs(hash((best_id, occasion, palette_id))) % 100000
            preview_url = _pollinations_url(prompt, seed=seed)
            source = f"pollinations:{err}" if err else "pollinations"
        else:
            preview_url = _stub_preview_url(best_id)
            source = f"stub:{err}" if err else "stub"

    # Price + suggestion + summary
    price       = _compute_price(payload, palette, format_info)
    suggested_id = CURATED_SUGGESTION.get(occasion, 1)
    suggested = query_one(
        """SELECT id, name, description, occasion, base_price_thb, image_url
           FROM curated_bouquets WHERE id = %s""",
        (suggested_id,),
    )

    tag_summary = {
        "palette": sorted(bag["palette"].keys(), key=lambda t: -bag["palette"][t])[:3],
        "vibe":    sorted(bag["vibe"].keys(),    key=lambda t: -bag["vibe"][t])[:3],
        "shape":   sorted(bag["shape"].keys(),   key=lambda t: -bag["shape"][t])[:3],
    }

    label_bits = []
    if MOOD_REFS.get(best_id):
        label_bits.append(MOOD_REFS[best_id]["name"])
    if palette:
        label_bits.append(palette["label"])
    label = " · ".join(label_bits) if label_bits else "Concierge bouquet"

    summary_lines = []
    if tag_summary["vibe"]:
        summary_lines.append("Vibe: " + ", ".join(tag_summary["vibe"]))
    if tag_summary["palette"]:
        summary_lines.append("Palette: " + ", ".join(tag_summary["palette"]))
    if tag_summary["shape"]:
        summary_lines.append("Shape: " + ", ".join(tag_summary["shape"]))

    return jsonify({
        "preview_url":        preview_url,
        "preview_source":     source,
        "label":              label,
        "summary":            " · ".join(summary_lines),
        "tags":               tag_summary,
        "price_thb":          price,
        "suggested_curated":  suggested,
        "best_mood_id":       best_id,
        "message":            _truncate_message(message_in, format_id),
        "format":             format_id,
        "format_label":       format_info["label"],
    })
