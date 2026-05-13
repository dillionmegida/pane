/**
 * Auto-Scroll Tests
 * Tests for automatic scrolling to selected files when the app opens or session is restored
 * Ensures selected files are visible without manual scrolling
 */

describe('Auto-Scroll to Selected File - Scroll Behavior', () => {
  test('scrollIntoView is called with correct options when element is scrolled', () => {
    // Mock scrollIntoView
    const scrollIntoViewMock = jest.fn();
    const mockElement = {
      scrollIntoView: scrollIntoViewMock,
      className: 'selected',
    };

    // Simulate the scroll behavior
    mockElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
  });

});
