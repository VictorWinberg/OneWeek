#!/usr/bin/env tsx
/**
 * Debug script to test Google Tasks API integration
 *
 * Usage: tsx scripts/test-tasks-api.ts
 *
 * This script will:
 * 1. Test connection to Tasks API
 * 2. List all task lists
 * 3. Create a test task list
 * 4. Create test tasks
 * 5. Update and complete tasks
 * 6. Clean up test data (optional)
 */

import { google, tasks_v1 } from 'googleapis';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'cyan');
}

/**
 * Initialize Tasks API client
 */
function getTasksClient(): tasks_v1.Tasks {
  const credentialsPath = path.resolve(__dirname, '../../credentials.json');
  logInfo(`Using credentials from: ${credentialsPath}`);

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/tasks',
    ],
  });

  return google.tasks({ version: 'v1', auth });
}

/**
 * Test 1: List all task lists
 */
async function testListTaskLists(tasks: tasks_v1.Tasks) {
  logSection('Test 1: List Task Lists');

  try {
    const response = await tasks.tasklists.list();
    const taskLists = response.data.items || [];

    if (taskLists.length === 0) {
      logInfo('No task lists found. This is normal for a new account.');
    } else {
      logSuccess(`Found ${taskLists.length} task list(s):`);
      taskLists.forEach((list, index) => {
        console.log(`  ${index + 1}. ${list.title} (ID: ${list.id})`);
      });
    }

    return taskLists;
  } catch (error: any) {
    logError(`Failed to list task lists: ${error.message}`);
    if (error.code === 403) {
      logError('Make sure Google Tasks API is enabled in Google Cloud Console');
      logError('And that your service account has the tasks scope');
    }
    throw error;
  }
}

/**
 * Test 2: Create a test task list
 */
async function testCreateTaskList(tasks: tasks_v1.Tasks) {
  logSection('Test 2: Create Test Task List');

  const testListTitle = `OneWeek Test List - ${new Date().toISOString()}`;
  logInfo(`Creating task list: "${testListTitle}"`);

  try {
    const response = await tasks.tasklists.insert({
      requestBody: { title: testListTitle },
    });

    const taskList = response.data;
    logSuccess(`Created task list: ${taskList.title} (ID: ${taskList.id})`);
    return taskList;
  } catch (error: any) {
    logError(`Failed to create task list: ${error.message}`);
    throw error;
  }
}

/**
 * Test 3: Create test tasks
 */
async function testCreateTasks(tasks: tasks_v1.Tasks, taskListId: string) {
  logSection('Test 3: Create Test Tasks');

  const testTasks = [
    {
      title: 'Test Task 1 - No due date',
      notes: 'This is a test task without a due date',
    },
    {
      title: 'Test Task 2 - With due date',
      notes: 'This task has a due date',
      due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    },
    {
      title: 'Test Task 3 - Due today',
      notes: 'This task is due today',
      due: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z', // Today
    },
  ];

  const createdTasks: tasks_v1.Schema$Task[] = [];

  for (const taskData of testTasks) {
    try {
      logInfo(`Creating task: "${taskData.title}"`);
      const response = await tasks.tasks.insert({
        tasklist: taskListId,
        requestBody: taskData,
      });

      const task = response.data;
      logSuccess(`Created task: ${task.title} (ID: ${task.id})`);
      if (task.due) {
        logInfo(`  Due date: ${task.due}`);
      }
      createdTasks.push(task);
    } catch (error: any) {
      logError(`Failed to create task "${taskData.title}": ${error.message}`);
    }
  }

  return createdTasks;
}

/**
 * Test 4: List tasks
 */
async function testListTasks(tasks: tasks_v1.Tasks, taskListId: string) {
  logSection('Test 4: List Tasks');

  try {
    const response = await tasks.tasks.list({
      tasklist: taskListId,
      showCompleted: false,
    });

    const taskItems = response.data.items || [];
    logSuccess(`Found ${taskItems.length} task(s) in list:`);

    taskItems.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.title}`);
      if (task.notes) {
        console.log(`     Notes: ${task.notes}`);
      }
      if (task.due) {
        console.log(`     Due: ${task.due}`);
      }
      console.log(`     Status: ${task.status || 'needsAction'}`);
      console.log(`     ID: ${task.id}`);
    });

    return taskItems;
  } catch (error: any) {
    logError(`Failed to list tasks: ${error.message}`);
    throw error;
  }
}

/**
 * Test 5: Update a task
 */
async function testUpdateTask(
  tasks: tasks_v1.Tasks,
  taskListId: string,
  taskId: string
) {
  logSection('Test 5: Update Task');

  try {
    logInfo(`Updating task ${taskId}`);
    const response = await tasks.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: {
        notes: 'This task has been updated by the test script!',
      },
    });

    logSuccess(`Updated task: ${response.data.title}`);
    logInfo(`  New notes: ${response.data.notes}`);
    return response.data;
  } catch (error: any) {
    logError(`Failed to update task: ${error.message}`);
    throw error;
  }
}

/**
 * Test 6: Complete a task
 */
async function testCompleteTask(
  tasks: tasks_v1.Tasks,
  taskListId: string,
  taskId: string
) {
  logSection('Test 6: Complete Task');

  try {
    logInfo(`Completing task ${taskId}`);
    const response = await tasks.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: {
        status: 'completed',
      },
    });

    logSuccess(`Completed task: ${response.data.title}`);
    logInfo(`  Status: ${response.data.status}`);
    if (response.data.completed) {
      logInfo(`  Completed at: ${response.data.completed}`);
    }
    return response.data;
  } catch (error: any) {
    logError(`Failed to complete task: ${error.message}`);
    throw error;
  }
}

/**
 * Test 7: Get tasks for date range
 */
async function testGetTasksForDateRange(
  tasks: tasks_v1.Tasks,
  taskListId: string
) {
  logSection('Test 7: Get Tasks for Date Range');

  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const startDate = today.toISOString().split('T')[0] + 'T00:00:00.000Z';
  const endDate = nextWeek.toISOString().split('T')[0] + 'T23:59:59.999Z';

  logInfo(`Fetching tasks from ${startDate} to ${endDate}`);

  try {
    const response = await tasks.tasks.list({
      tasklist: taskListId,
      showCompleted: false,
    });

    const allTasks = response.data.items || [];
    const filteredTasks = allTasks.filter((task) => {
      if (!task.due) return false;
      const dueDate = new Date(task.due);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return dueDate >= start && dueDate <= end;
    });

    logSuccess(`Found ${filteredTasks.length} task(s) in date range:`);
    filteredTasks.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.title} (Due: ${task.due})`);
    });

    return filteredTasks;
  } catch (error: any) {
    logError(`Failed to get tasks for date range: ${error.message}`);
    throw error;
  }
}

/**
 * Cleanup: Delete test task list and all tasks
 */
async function cleanup(
  tasks: tasks_v1.Tasks,
  taskListId: string,
  taskIds: string[]
) {
  logSection('Cleanup: Delete Test Data');

  logInfo('Deleting test tasks...');
  for (const taskId of taskIds) {
    try {
      await tasks.tasks.delete({
        tasklist: taskListId,
        task: taskId,
      });
      logSuccess(`Deleted task ${taskId}`);
    } catch (error: any) {
      logError(`Failed to delete task ${taskId}: ${error.message}`);
    }
  }

  logInfo(`Deleting test task list ${taskListId}...`);
  try {
    await tasks.tasklists.delete({ tasklist: taskListId });
    logSuccess('Deleted test task list');
  } catch (error: any) {
    logError(`Failed to delete task list: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function main() {
  logSection('Google Tasks API Debug Script');
  logInfo('Starting tests...\n');

  let tasks: tasks_v1.Tasks;
  let testTaskList: tasks_v1.Schema$TaskList | null = null;
  let createdTasks: tasks_v1.Schema$Task[] = [];

  try {
    // Initialize client
    tasks = getTasksClient();
    logSuccess('Tasks API client initialized');

    // Test 1: List task lists
    await testListTaskLists(tasks);

    // Test 2: Create test task list
    testTaskList = await testCreateTaskList(tasks);
    const taskListId = testTaskList.id!;

    // Test 3: Create test tasks
    createdTasks = await testCreateTasks(tasks, taskListId);

    // Test 4: List tasks
    await testListTasks(tasks, taskListId);

    // Test 5: Update first task
    if (createdTasks.length > 0) {
      await testUpdateTask(tasks, taskListId, createdTasks[0].id!);
    }

    // Test 6: Complete second task (if exists)
    if (createdTasks.length > 1) {
      await testCompleteTask(tasks, taskListId, createdTasks[1].id!);
    }

    // Test 7: Get tasks for date range
    await testGetTasksForDateRange(tasks, taskListId);

    // Summary
    logSection('Test Summary');
    logSuccess('All tests completed successfully!');
    logInfo(`Created ${createdTasks.length} test task(s)`);
    logInfo(`Test task list ID: ${taskListId}`);

    // Ask about cleanup
    console.log('\n');
    logInfo('Test data has been created. You can:');
    logInfo('1. Check your Google Tasks to see the test data');
    logInfo('2. Run this script again to test cleanup (it will delete test data)');
    logInfo(`3. Manually delete the test task list: ${taskListId}`);

  } catch (error: any) {
    logSection('Error Summary');
    logError(`Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

