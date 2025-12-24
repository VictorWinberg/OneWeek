import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

interface CalendarConfigItem {
  id: string;
  name: string;
  color: string;
}

interface ConfigFile {
  allowedEmails?: string[];
  calendars: CalendarConfigItem[];
}

// Load config from file
function loadConfig(): ConfigFile {
  try {
    // Read from project root (parent of backend directory)
    const configPath = join(process.cwd(), '..', 'config.json');
    const configData = readFileSync(configPath, 'utf-8');
    const configFile: ConfigFile = JSON.parse(configData);

    return configFile;
  } catch (error) {
    console.error('Error loading config:', error);
    return { calendars: [] };
  }
}

// Load config at module level
const config = loadConfig();
export const allowedEmails = config.allowedEmails || [];

// GET /api/config/calendars - Get calendar configuration
router.get('/calendars', (req, res) => {
  try {
    res.json({ calendars: config.calendars });
  } catch (error) {
    console.error('Error getting calendar config:', error);
    res.status(500).json({ error: 'Failed to load calendar configuration' });
  }
});

export default router;
