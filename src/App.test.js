import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock child components - Webplayback and Login
jest.mock('./WebPlayback', () => {
  return {
    __esModule: true,
    default: () => <div>WebPlayback component</div>,
  };
});
jest.mock('./Login', () => {
  return {
    __esModule: true,
    default: () => <div>Login component</div>,
  };
});

// Helper function to mock fetch response
const mockFetch = (accessToken) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ access_token: accessToken }),
    }),
  );
};

// suite for testing App behavior with empty vs. non-empty token
describe('App', () => {
  it('renders Login component when there is no token', () => {
    mockFetch(''); // Mock fetch to return empty token
    render(<App />);
    const loginElement = screen.getByText('Login component');
    expect(loginElement).toBeInTheDocument();
  });

  it('renders WebPlayback component when token is retrieved', async () => {
    mockFetch('fake-token'); // Mock fetch to return a fake token
    render(<App />);
    const webPlaybackElement = await screen.findByText('WebPlayback component');
    expect(webPlaybackElement).toBeInTheDocument();
  });

  // Reset mocks after each test
  afterEach(() => {
    jest.restoreAllMocks();
  });
});
