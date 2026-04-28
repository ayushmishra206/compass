import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Onboarding } from './index';

expect.extend(toHaveNoViolations);

vi.mock('@compass/agents', () => ({
  stubs: {
    validateLlmKey: vi.fn(),
  },
}));

vi.mock('@compass/core', () => ({
  setActiveCredentials: vi.fn(),
}));

import * as agents from '@compass/agents';
import * as core from '@compass/core';

describe('Onboarding', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Render', () => {
    it('renders the wizard cleanly', () => {
      render(<Onboarding onClose={mockOnClose} />);
      expect(screen.getByText(/Welcome to Compass AI/)).toBeInTheDocument();
      expect(screen.getByText(/A calm new tab/)).toBeInTheDocument();
    });

    it('is accessible', async () => {
      const { container } = render(<Onboarding onClose={mockOnClose} />);
      const results = await axe(container as HTMLElement);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Skip path', () => {
    it('closes overlay on skip from welcome step', async () => {
      const user = userEvent.setup();
      render(<Onboarding onClose={mockOnClose} />);
      const skipButtons = screen.getAllByText(/Skip — add a key later/);
      if (skipButtons[0]) {
        await user.click(skipButtons[0]);
      }
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes overlay on skip from connect step', async () => {
      const user = userEvent.setup();
      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to step 1
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Click skip
      const skipButtons = screen.getAllByText(/Skip — add a key later/);
      const skipButton = skipButtons[skipButtons.length - 1];
      if (skipButton) {
        await user.click(skipButton);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Validation happy path', () => {
    it('advances to done step and calls setActiveCredentials on valid key', async () => {
      const user = userEvent.setup();
      const mockValidateLlmKey = vi.mocked(agents.stubs.validateLlmKey);
      const mockSetActiveCredentials = vi.mocked(core.setActiveCredentials);

      mockValidateLlmKey.mockResolvedValue({ valid: true });

      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step - click button in main area
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Enter key and validate
      const input = screen.getByPlaceholderText('sk-or-…');
      await user.type(input, 'test-key-123');

      const validateButton = screen.getByText('Validate');
      await user.click(validateButton);

      // Wait for setActiveCredentials to be called
      await waitFor(() => {
        expect(mockSetActiveCredentials).toHaveBeenCalledWith(
          expect.objectContaining({
            default: 'openrouter',
            openrouter: expect.objectContaining({
              apiKey: 'test-key-123',
            }),
          }),
        );
      });

      // Wait for done step to appear
      await waitFor(() => {
        expect(screen.getByText(/You're set/)).toBeInTheDocument();
      });
    });
  });

  describe('Validation error handling', () => {
    it('displays error message on invalid key', async () => {
      const user = userEvent.setup();
      const mockValidateLlmKey = vi.mocked(agents.stubs.validateLlmKey);

      mockValidateLlmKey.mockResolvedValue({
        valid: false,
        error: '401 Unauthorized',
      });

      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Enter key and validate
      const input = screen.getByPlaceholderText('sk-or-…');
      await user.type(input, 'invalid-key');

      const validateButton = screen.getByText('Validate');
      await user.click(validateButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/OpenRouter says this key is invalid/)).toBeInTheDocument();
      });
    });

    it('displays appropriate message for rate limit error', async () => {
      const user = userEvent.setup();
      const mockValidateLlmKey = vi.mocked(agents.stubs.validateLlmKey);

      mockValidateLlmKey.mockResolvedValue({
        valid: false,
        error: '429 Too Many Requests',
      });

      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Enter key and validate
      const input = screen.getByPlaceholderText('sk-or-…');
      await user.type(input, 'test-key');

      const validateButton = screen.getByText('Validate');
      await user.click(validateButton);

      // Wait for rate limit error message
      await waitFor(() => {
        expect(screen.getByText(/rate-limiting validation requests/)).toBeInTheDocument();
      });
    });

    it('displays appropriate message for network error', async () => {
      const user = userEvent.setup();
      const mockValidateLlmKey = vi.mocked(agents.stubs.validateLlmKey);

      mockValidateLlmKey.mockRejectedValue(new Error('Network error'));

      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Enter key and validate
      const input = screen.getByPlaceholderText('sk-or-…');
      await user.type(input, 'test-key');

      const validateButton = screen.getByText('Validate');
      await user.click(validateButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('displays appropriate message for LlmTimeout error', async () => {
      const user = userEvent.setup();
      const mockValidateLlmKey = vi.mocked(agents.stubs.validateLlmKey);

      const timeoutError = new Error('OpenRouter took too long');
      timeoutError.name = 'LlmTimeout';
      mockValidateLlmKey.mockRejectedValue(timeoutError);

      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Enter key and validate
      const input = screen.getByPlaceholderText('sk-or-…');
      await user.type(input, 'test-key');

      const validateButton = screen.getByText('Validate');
      await user.click(validateButton);

      // Wait for timeout error message
      await waitFor(() => {
        expect(screen.getByText(/took too long to respond/)).toBeInTheDocument();
      });
    });

    it('displays appropriate message for LlmUnavailable error', async () => {
      const user = userEvent.setup();
      const mockValidateLlmKey = vi.mocked(agents.stubs.validateLlmKey);

      const unavailError = new Error('Service unavailable');
      unavailError.name = 'LlmUnavailable';
      mockValidateLlmKey.mockRejectedValue(unavailError);

      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Enter key and validate
      const input = screen.getByPlaceholderText('sk-or-…');
      await user.type(input, 'test-key');

      const validateButton = screen.getByText('Validate');
      await user.click(validateButton);

      // Wait for unavailability error message
      await waitFor(() => {
        expect(screen.getByText(/appears to be down/)).toBeInTheDocument();
      });
    });
  });

  describe('UI interactions', () => {
    it('toggles key visibility', async () => {
      const user = userEvent.setup();
      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      const input = screen.getByPlaceholderText('sk-or-…') as HTMLInputElement;
      const toggleButton = screen.getByLabelText('Toggle key visibility');

      // Input should start as password
      expect(input.type).toBe('password');

      // Click toggle to show
      await user.click(toggleButton);
      expect(input.type).toBe('text');

      // Click toggle to hide
      await user.click(toggleButton);
      expect(input.type).toBe('password');
    });

    it('disables validate button when key is empty', async () => {
      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        fireEvent.click(connectButton);
      }

      const validateButton = screen.getByText('Validate');
      expect(validateButton).toBeDisabled();
    });

    it('enables validate button when key is entered', async () => {
      const user = userEvent.setup();
      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      const input = screen.getByPlaceholderText('sk-or-…');
      const validateButton = screen.getByText('Validate');

      expect(validateButton).toBeDisabled();

      await user.type(input, 'test-key');
      expect(validateButton).not.toBeDisabled();
    });

    it('clears error when user modifies input', async () => {
      const user = userEvent.setup();
      const mockValidateLlmKey = vi.mocked(agents.stubs.validateLlmKey);

      mockValidateLlmKey.mockResolvedValueOnce({
        valid: false,
        error: '401 Unauthorized',
      });

      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Enter key and validate
      const input = screen.getByPlaceholderText('sk-or-…');
      await user.type(input, 'invalid-key');

      const validateButton = screen.getByText('Validate');
      await user.click(validateButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/OpenRouter says this key is invalid/)).toBeInTheDocument();
      });

      // Modify input should clear error
      await user.clear(input);
      await user.type(input, 'new-key');

      // Error should be gone
      expect(screen.queryByText(/OpenRouter says this key is invalid/)).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('allows going back from connect step', async () => {
      const user = userEvent.setup();
      render(<Onboarding onClose={mockOnClose} />);

      // Navigate to connect step
      const mainArea = screen.getByText(/A calm new tab/).closest('main');
      const connectButton = mainArea?.querySelector('button[class*="accent"]');
      if (connectButton) {
        await user.click(connectButton);
      }

      // Verify we're on connect step
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();

      // Click back
      const backButton = screen.getByText('Back');
      await user.click(backButton);

      // Should be back to welcome
      expect(screen.getByText(/Welcome to Compass AI/)).toBeInTheDocument();
    });
  });
});
