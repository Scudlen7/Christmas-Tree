"""Run with Playwright against npm run preview."""

from playwright.sync_api import expect, sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", args=["--enable-unsafe-swiftshader"])
    page = browser.new_page(viewport={"width": 320, "height": 600}, is_mobile=True, has_touch=True)
    errors = []
    page.on("pageerror", lambda error: errors.append(error))
    page.route("https://**", lambda route: route.abort())
    page.add_init_script("""
        navigator.mediaDevices.getUserMedia = async () => {
            throw new DOMException("Camera denied", "NotAllowedError");
        };
    """)

    with page.expect_response(lambda response: response.url.endswith("/photos/gifts.png") and response.ok):
        page.goto("http://127.0.0.1:4173/")
    expect(page.locator("canvas").first).to_be_visible()
    assemble = page.get_by_role("button", name="Assemble Tree")
    debug = page.get_by_role("button", name="DEBUG")
    stats = page.locator(".tree-stats").bounding_box()
    actions = page.locator(".tree-actions").bounding_box()
    assert stats["y"] + stats["height"] < actions["y"]
    assert actions["x"] >= 0

    page.keyboard.press("Tab")
    memories = page.get_by_role("button", name="Memories")
    expect(memories).to_be_focused()
    page.keyboard.press("Enter")
    preview = page.get_by_role("dialog", name="Photo preview")
    expect(preview.locator("img")).to_have_attribute("src", "/photos/gifts.png")
    page.wait_for_function("document.querySelector('.photo-viewer img').naturalWidth > 0")
    page.keyboard.press("ArrowRight")
    expect(preview.locator("img")).to_have_attribute("src", "/photos/wreath.png")
    page.keyboard.press("Escape")
    expect(preview).not_to_be_visible()
    expect(memories).to_be_focused()

    page.keyboard.press("Tab")
    expect(debug).to_be_focused()
    page.keyboard.press("Tab")
    expect(assemble).to_be_focused()
    page.keyboard.press("Enter")
    disperse = page.get_by_role("button", name="Disperse")
    expect(disperse).to_be_visible()
    disperse.tap()
    expect(assemble).to_be_visible()
    debug.tap()
    expect(page.get_by_role("button", name="HIDE DEBUG")).to_have_attribute("aria-pressed", "true")
    expect(page.get_by_text("ERROR: Camera denied")).to_be_visible(timeout=60_000)
    assert not errors, errors
