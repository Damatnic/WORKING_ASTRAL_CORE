/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AnalyticsPage from '@/app/dashboard/analytics/page';

// Mock Chart.js components
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart={JSON.stringify(data)}>
      Line Chart: {data.datasets[0].label}
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart={JSON.stringify(data)}>
      Bar Chart: {data.datasets[0].label}
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart={JSON.stringify(data)}>
      Doughnut Chart
    </div>
  ),
}));

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  ArcElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn(),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard/analytics',
  }),
}));

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('AnalyticsPage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders analytics dashboard correctly', () => {
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Insights into your mental health journey')).toBeInTheDocument();
  });

  it('displays time range selector', () => {
    render(<AnalyticsPage />);
    
    const timeRangeSelect = screen.getByDisplayValue('Last 30 days');
    expect(timeRangeSelect).toBeInTheDocument();
    
    // Check all time range options
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
    expect(screen.getByText('Last year')).toBeInTheDocument();
  });

  it('has export functionality', () => {
    render(<AnalyticsPage />);
    
    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeInTheDocument();
  });

  it('displays wellness metrics cards', () => {
    render(<AnalyticsPage />);
    
    // Check metric titles
    expect(screen.getByText('Mood Score')).toBeInTheDocument();
    expect(screen.getByText('Therapy Sessions')).toBeInTheDocument();
    expect(screen.getByText('Wellness Activities')).toBeInTheDocument();
    expect(screen.getByText('Community Engagement')).toBeInTheDocument();
    
    // Check metric values
    expect(screen.getByText('4.3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    
    // Check change percentages
    expect(screen.getByText('+13%')).toBeInTheDocument();
    expect(screen.getByText('+50%')).toBeInTheDocument();
    expect(screen.getByText('+23%')).toBeInTheDocument();
    expect(screen.getByText('-33%')).toBeInTheDocument();
  });

  it('displays mood trend chart', () => {
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Mood Trend')).toBeInTheDocument();
    
    const lineChart = screen.getByTestId('line-chart');
    expect(lineChart).toBeInTheDocument();
    expect(lineChart).toHaveTextContent('Line Chart: Average Mood');
  });

  it('displays emotion distribution chart', () => {
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Emotion Distribution')).toBeInTheDocument();
    
    const doughnutChart = screen.getByTestId('doughnut-chart');
    expect(doughnutChart).toBeInTheDocument();
  });

  it('displays weekly activity chart', () => {
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Weekly Activity')).toBeInTheDocument();
    
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart).toBeInTheDocument();
    expect(barChart).toHaveTextContent('Bar Chart: Therapy Sessions');
  });

  it('shows AI-generated insights', () => {
    render(<AnalyticsPage />);
    
    expect(screen.getByText('AI-Generated Insights')).toBeInTheDocument();
    expect(screen.getByText('Mood Improvement')).toBeInTheDocument();
    expect(screen.getByText('Weekly Pattern')).toBeInTheDocument();
    expect(screen.getByText('Goal Achievement')).toBeInTheDocument();
    
    // Check insight descriptions
    expect(screen.getByText(/Your average mood has improved by 13%/)).toBeInTheDocument();
    expect(screen.getByText(/You tend to have better mood scores on weekends/)).toBeInTheDocument();
    expect(screen.getByText(/You've completed 85% of your wellness goals/)).toBeInTheDocument();
  });

  it('displays goal progress section', () => {
    render(<AnalyticsPage />);
    
    expect(screen.getByText('Goal Progress')).toBeInTheDocument();
    
    // Check goal names
    expect(screen.getByText('Daily Mood Tracking')).toBeInTheDocument();
    expect(screen.getByText('Weekly Therapy Sessions')).toBeInTheDocument();
    expect(screen.getByText('Mindfulness Practice')).toBeInTheDocument();
    expect(screen.getByText('Physical Activity')).toBeInTheDocument();
    
    // Check progress percentages
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    
    // Check targets
    expect(screen.getByText('Target: 30 days')).toBeInTheDocument();
    expect(screen.getByText('Target: 4 sessions')).toBeInTheDocument();
    expect(screen.getByText('Target: 10 minutes daily')).toBeInTheDocument();
    expect(screen.getByText('Target: 3 times per week')).toBeInTheDocument();
  });

  it('changes time range when selector is used', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    
    const timeRangeSelect = screen.getByDisplayValue('Last 30 days');
    
    await user.selectOptions(timeRangeSelect, 'Last 7 days');
    expect(timeRangeSelect).toHaveValue('7d');
    
    await user.selectOptions(timeRangeSelect, 'Last 90 days');
    expect(timeRangeSelect).toHaveValue('90d');
  });

  it('has accessible back navigation', () => {
    render(<AnalyticsPage />);
    
    const backLink = screen.getByRole('link', { name: /dashboard/i });
    expect(backLink).toHaveAttribute('href', '/dashboard');
  });

  it('displays metric icons correctly', () => {
    render(<AnalyticsPage />);
    
    // Each metric should have an associated icon
    // We can check that the metrics are rendered with their icons
    const metricCards = screen.getAllByText(/\d+%/); // All percentage changes
    expect(metricCards.length).toBeGreaterThan(0);
  });

  it('shows previous period comparison', () => {
    render(<AnalyticsPage />);
    
    expect(screen.getByText('vs. 3.8 last period')).toBeInTheDocument();
    expect(screen.getByText('vs. 8 last period')).toBeInTheDocument();
    expect(screen.getByText('vs. 22 last period')).toBeInTheDocument();
    expect(screen.getByText('vs. 12 last period')).toBeInTheDocument();
  });

  it('handles export button click', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    
    const exportButton = screen.getByText('Export');
    await user.click(exportButton);
    
    // Export functionality would be tested based on implementation
    // For now, just verify the button is clickable
    expect(exportButton).toBeInTheDocument();
  });

  it('displays trend indicators correctly', () => {
    render(<AnalyticsPage />);
    
    // Positive trends should show + signs
    expect(screen.getByText('+13%')).toBeInTheDocument();
    expect(screen.getByText('+50%')).toBeInTheDocument();
    expect(screen.getByText('+23%')).toBeInTheDocument();
    
    // Negative trends should show - signs
    expect(screen.getByText('-33%')).toBeInTheDocument();
  });

  it('renders all chart sections', () => {
    render(<AnalyticsPage />);
    
    // Check that all chart sections are present
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('displays goal progress bars', () => {
    render(<AnalyticsPage />);
    
    // Each goal should have a progress bar
    const progressElements = document.querySelectorAll('[style*="width"]');
    expect(progressElements.length).toBeGreaterThan(0);
  });

  it('shows insight categories with proper icons', () => {
    render(<AnalyticsPage />);
    
    // Each insight should have a category icon
    expect(screen.getByText('Mood Improvement')).toBeInTheDocument();
    expect(screen.getByText('Weekly Pattern')).toBeInTheDocument();
    expect(screen.getByText('Goal Achievement')).toBeInTheDocument();
  });

  it('handles time range changes correctly', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    
    const timeRangeSelect = screen.getByDisplayValue('Last 30 days');
    
    // Test all time range options
    await user.selectOptions(timeRangeSelect, '7d');
    expect(timeRangeSelect).toHaveValue('7d');
    
    await user.selectOptions(timeRangeSelect, '90d');
    expect(timeRangeSelect).toHaveValue('90d');
    
    await user.selectOptions(timeRangeSelect, '1y');
    expect(timeRangeSelect).toHaveValue('1y');
  });
});
/* eslint-disable react/display-name */
