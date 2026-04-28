const imports = [
  'src/services/settingsSync/index.js',
  'src/services/remoteManagedSettings/index.js',
  'src/cli/structuredIO.js',
  'src/cli/remoteIO.js',
  'src/commands.js',
  'src/utils/streamlinedTransform.js',
  'src/utils/streamJsonStdoutGuard.js',
  'src/Tool.js',
  'src/utils/thinking.js',
  'src/tools.js',
  'src/utils/array.js',
  'src/utils/toolPool.js',
  'src/services/analytics/index.js',
  'src/services/analytics/growthbook.js',
  'src/utils/debug.js',
  'src/utils/diagLogs.js',
  'src/tools/AgentTool/loadAgentsDir.js',
  'src/types/message.js',
  'src/types/textInputTypes.js',
  'src/utils/messageQueueManager.js',
  'src/utils/commandLifecycle.js',
  'src/utils/sessionState.js',
  'src/state/onChangeAppState.js',
  'src/utils/log.js',
  'src/utils/process.js',
  'src/utils/stream.js',
  'src/services/api/logging.js',
  'src/utils/conversationRecovery.js',
  'src/services/mcp/types.js',
  'src/services/mcp/channelNotification.js',
  'src/services/mcp/channelAllowlist.js',
  'src/utils/plugins/pluginIdentifier.js',
  'src/utils/uuid.js',
  'src/utils/generators.js',
  'src/QueryEngine.js',
  'src/utils/queryHelpers.js',
  'src/utils/fileStateCache.js',
  'src/utils/path.js',
  'src/utils/hooks/hookEvents.js',
  'src/utils/filePersistence/filePersistence.js',
  'src/utils/hooks/AsyncHookRegistry.js',
  'src/utils/gracefulShutdown.js',
  'src/utils/cleanupRegistry.js',
  'src/utils/idleTimeout.js',
]

setTimeout(() => {
  console.error('GLOBAL TIMEOUT - exiting')
  process.exit(1)
}, 30000)

for (const mod of imports) {
  console.error(`Testing import: ${mod}`)
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 5000))
  try {
    await Promise.race([import(mod), timeout])
    console.error(`  OK: ${mod}`)
  } catch (e) {
    console.error(`  FAIL: ${mod} - ${e instanceof Error ? e.message : String(e)}`)
    if (String(e) === 'TIMEOUT' || (e instanceof Error && e.message === 'TIMEOUT')) {
      console.error('  HANG DETECTED - stopping')
      break
    }
  }
}
console.error('Done')
process.exit(0)
