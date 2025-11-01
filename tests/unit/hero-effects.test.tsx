import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomePage } from '../../src/pages/HomePage';

/**
 * Hero Effects Test Suite
 *
 * This test suite verifies that the hero section CSS effects are properly implemented:
 * - DOM elements have the correct structure for effects
 * - Particles are rendered with randomized properties
 * - Component renders without errors with all effects
 */
describe('Hero Section Effects', () => {
  beforeEach(() => {
    // Mock Math.random for consistent particle testing
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render hero section with all essential elements', () => {
    render(<HomePage />);

    // Check title exists with expected content
    const title = screen.getByText('Options Trading Dashboard');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H1');

    // Check subtitle exists with expected content
    const subtitle = screen.getByText(/Monitor your portfolio/);
    expect(subtitle).toBeInTheDocument();
    expect(subtitle.tagName).toBe('P');
  });

  it('should render 12 animated particles with CSS classes', () => {
    render(<HomePage />);

    // Look for divs that have particle-like characteristics
    const particleDivs = Array.from(document.querySelectorAll('div')).filter(div => {
      const style = div.getAttribute('style');
      return style && style.includes('left:') && style.includes('animation');
    });

    expect(particleDivs).toHaveLength(12);

    // Check each particle has inline styles for positioning and animation
    particleDivs.forEach(particle => {
      const style = particle.getAttribute('style') || '';
      expect(style).toContain('left: 50%'); // Math.random() mocked to 0.5
      expect(style).toContain('animation-delay');
      expect(style).toContain('animation-duration');
    });
  });

  it('should render particles with randomized properties', () => {
    // Restore Math.random for this test to get actual randomization
    vi.restoreAllMocks();

    render(<HomePage />);

    const particleDivs = Array.from(document.querySelectorAll('div')).filter(div => {
      const style = div.getAttribute('style');
      return style && style.includes('left:') && style.includes('animation');
    });

    // Extract positions and timing values
    const positions = particleDivs.map(p => {
      const style = p.getAttribute('style') || '';
      const match = style.match(/left:\s*([^;]+)/);
      return match ? match[1] : '';
    });

    const delays = particleDivs.map(p => {
      const style = p.getAttribute('style') || '';
      const match = style.match(/animation-delay:\s*([^;]+)/);
      return match ? match[1] : '';
    });

    // Check that particles have different positions (randomized)
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBeGreaterThan(5); // Should have variety

    // Check that particles have different animation delays
    const uniqueDelays = new Set(delays);
    expect(uniqueDelays.size).toBeGreaterThan(5); // Should have variety
  });

  it('should have proper DOM structure for effects', () => {
    render(<HomePage />);

    // Find the hero container by looking for the title's parent structure
    const title = screen.getByText('Options Trading Dashboard');
    const subtitle = screen.getByText(/Monitor your portfolio/);

    // Both should be present in the DOM
    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();

    // Check for particle container (should have multiple divs with inline styles)
    const particleDivs = Array.from(document.querySelectorAll('div')).filter(div => {
      const style = div.getAttribute('style');
      return style && style.includes('left:') && style.includes('animation');
    });

    expect(particleDivs.length).toBe(12);
  });

  it('should render without errors when effects are applied', () => {
    // This test ensures that the component renders successfully
    // with all the CSS effects without throwing errors
    expect(() => {
      render(<HomePage />);
    }).not.toThrow();

    // Verify the main elements are rendered
    expect(screen.getByText('Options Trading Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Monitor your portfolio/)).toBeInTheDocument();
  });

  it('should have CSS classes applied to hero elements', () => {
    render(<HomePage />);

    // Find the hero section by looking for the container with title and subtitle
    const title = screen.getByText('Options Trading Dashboard');
    const subtitle = screen.getByText(/Monitor your portfolio/);

    // Check that elements have CSS classes (they should have className attributes)
    expect(title.className).toBeTruthy();
    expect(subtitle.className).toBeTruthy();

    // The hero container should be a parent of both title and subtitle
    const heroContainer = title.closest('div');
    expect(heroContainer).toContainElement(title);
    expect(heroContainer).toContainElement(subtitle);
  });
});
