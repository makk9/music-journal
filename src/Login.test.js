import React from 'react';
import { render, screen } from '@testing-library/react';
import Login from './Login';

// suite that tests basic rendering 
describe('Login Component', () => {
    test('renders Login with Spotify link', () => {
        render(<Login />);
        const loginLinkElement = screen.getByRole('link', { name: /login with spotify/i });
        expect(loginLinkElement).toBeInTheDocument();
    });

    test('link points to the correct authentication URL', () => {
        render(<Login />);
        const loginLinkElement = screen.getByRole('link', { name: /login with spotify/i });
        expect(loginLinkElement).toHaveAttribute('href', '/auth/login');
    });
});
