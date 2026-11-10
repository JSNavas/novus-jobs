import { Tab, Tabs } from '@mui/material';

export interface AppTab {
  value: string;
  label: string;
}

interface AppTabsProps {
  tabs: AppTab[];
  value: string;
  onChange: (value: string) => void;
}

const AppTabs = ({ tabs, value, onChange }: AppTabsProps) => (
  <Tabs value={value} onChange={(_event, next: string) => onChange(next)} sx={{ mb: 2 }}>
    {tabs.map((tab) => (
      <Tab key={tab.value} value={tab.value} label={tab.label} />
    ))}
  </Tabs>
);

export default AppTabs;
