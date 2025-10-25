import { useState, useEffect } from 'react'

const API_BASE_URL = '/api/v1';

function App() {
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [filter, setFilter] = useState('all');
    const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch stats from API
    const fetchStats = async (currentTasks = null) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                // If stats endpoint fails, calculate from local tasks
                const tasksToUse = currentTasks || tasks;
                const total = tasksToUse.length;
                const completed = tasksToUse.filter(task => task.completed).length;
                const pending = total - completed;
                setStats({ total, completed, pending });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Calculate stats from local tasks as fallback
            const tasksToUse = currentTasks || tasks;
            const total = tasksToUse.length;
            const completed = tasksToUse.filter(task => task.completed).length;
            const pending = total - completed;
            setStats({ total, completed, pending });
        }
    };

    // Fetch tasks from API
    const fetchTasks = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/tasks?filter=${filter}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            const data = await response.json();
            setTasks(data);
            // Update stats immediately with fetched data
            await fetchStats(data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            setError(`Failed to load tasks: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Load tasks when component mounts or filter changes
    useEffect(() => {
        fetchTasks().catch(err => {
            console.error('Failed to load tasks on mount:', err);
        });
    }, [filter]);

    // Add task via API
    const addTask = async () => {
        if (newTask.trim() !== '') {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: newTask.trim() }),
                });

                if (response.ok) {
                    setNewTask('');
                    await fetchTasks(); // Refresh tasks from API
                    setError('');
                } else {
                    // Get error details from response
                    const errorData = await response.json();
                    console.error('Server error:', errorData);
                    throw new Error(errorData.error || `Server returned ${response.status}`);
                }
            } catch (error) {
                console.error('Error adding task:', error);
                setError(`Failed to save task: ${error.message}`);
            } finally {
                setLoading(false);
            }
        }
    };

    // Delete task via API
    const deleteTask = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchTasks(); // Refresh tasks from API
                setError('');
            } else {
                throw new Error('Failed to delete task');
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            setError('Failed to delete task from server. Please try again.');
        }
    };

    // Toggle task completion via API
    const toggleTask = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/tasks/${id}/toggle`, {
                method: 'PATCH',
            });

            if (response.ok) {
                await fetchTasks(); // Refresh tasks from API
                setError('');
            } else {
                throw new Error('Failed to toggle task');
            }
        } catch (error) {
            console.error('Error toggling task:', error);
            setError('Failed to update task on server. Please try again.');
        }
    };

    // Clear all tasks via API
    const clearAllTasks = async () => {
        if (window.confirm('Are you sure you want to delete all tasks? This action cannot be undone.')) {
            try {
                const response = await fetch(`${API_BASE_URL}/tasks`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    await fetchTasks(); // Refresh tasks from API
                    setError('');
                } else {
                    throw new Error('Failed to clear tasks');
                }
            } catch (error) {
                console.error('Error clearing tasks:', error);
                setError('Failed to clear tasks on server. Please try again.');
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            addTask();
        }
    };

    // Filter tasks based on current filter - with safety check
    const filteredTasks = Array.isArray(tasks) ? tasks.filter(task => {
        if (filter === 'completed') return task.completed;
        if (filter === 'pending') return !task.completed;
        return true;
    }) : [];

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Task Manager</h1>
                    <p className="text-gray-600">Organize your tasks efficiently</p>

                    {/* API Status */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}
                </div>

                {/* Add Task Section */}
                <div className="mb-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter a new task..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={loading}
                        />
                        <button
                            onClick={addTask}
                            disabled={loading || !newTask.trim()}
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Adding...' : 'Add Task'}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                        <div className="text-sm text-blue-500">Total Tasks</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                        <div className="text-sm text-green-500">Completed</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                        <div className="text-sm text-yellow-500">Pending</div>
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="mb-6 flex gap-2 justify-center">
                    {['all', 'pending', 'completed'].map((filterType) => (
                        <button
                            key={filterType}
                            onClick={() => setFilter(filterType)}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg transition-colors capitalize disabled:opacity-50 ${
                                filter === filterType
                                    ? filterType === 'all' ? 'bg-gray-800 text-white' :
                                        filterType === 'pending' ? 'bg-yellow-500 text-white' :
                                            'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            {filterType}
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading tasks...</p>
                    </div>
                )}

                {/* Task List */}
                {!loading && (
                    <div className="space-y-3">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📝</div>
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    {stats.total === 0 ? 'No tasks yet' : 'No tasks match this filter'}
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    {stats.total === 0
                                        ? 'Get started by adding your first task above!'
                                        : 'Try changing your filter or add a new task'
                                    }
                                </p>
                                {stats.total === 0 && (
                                    <button
                                        onClick={() => document.querySelector('input').focus()}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        Add Your First Task
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredTasks.map(task => (
                                <div
                                    key={task.id || task._id}
                                    className={`flex items-center justify-between p-4 rounded-lg border transition-all task-item ${
                                        task.completed
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-white border-gray-200 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() => toggleTask(task.id || task._id)}
                                            disabled={loading}
                                            className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400 disabled:opacity-50"
                                        />
                                        <span
                                            className={`text-lg ${
                                                task.completed
                                                    ? 'line-through text-gray-500'
                                                    : 'text-gray-800'
                                            }`}
                                        >
                                            {task.text}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => deleteTask(task.id || task._id)}
                                        disabled={loading}
                                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Clear All Button */}
                {stats.total > 0 && !loading && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={clearAllTasks}
                            disabled={loading}
                            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
                        >
                            Clear All Tasks
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;