import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserReputationSummary from './UserReputationSummary';

describe('UserReputationSummary', () => {
  const zeroReviewReputation = {
    total_reviews: 0,
    average_rating: 0,
    five_star_count: 0,
    four_star_count: 0,
    three_star_count: 0,
    two_star_count: 0,
    one_star_count: 0,
  };

  it('handles a user with zero reviews gracefully', () => {
    render(<UserReputationSummary reputation={zeroReviewReputation} />);

    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.0/)).not.toBeInTheDocument();
  });

  it('handles a user with zero reviews gracefully in the compact variant', () => {
    render(<UserReputationSummary reputation={zeroReviewReputation} compact />);

    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/nan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.0/)).not.toBeInTheDocument();
  });
});