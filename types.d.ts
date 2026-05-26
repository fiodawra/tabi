type CommandItemConfig = {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
  shortcut?: RegisterableHotkey;
};

type CommandGroupConfig = {
  items: Array<CommandItemConfig>;
  label: string;
};
