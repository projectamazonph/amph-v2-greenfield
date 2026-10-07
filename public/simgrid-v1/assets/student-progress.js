(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudentProgress = factory();
  }
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var DEFAULT_KEY = 'aph-student-progress-v1';
  var STATE_VERSION = 2;

  function emptyState() {
    return { version: STATE_VERSION, attempts: [] };
  }

  function requireValue(attempt, field) {
    if (attempt[field] === undefined || attempt[field] === null || attempt[field] === '') {
      throw new TypeError(field + ' is required');
    }
  }

  function validateAttempt(attempt) {
    requireValue(attempt, 'simulatorId');
    requireValue(attempt, 'scenarioVersion');
    requireValue(attempt, 'rubricVersion');
    requireValue(attempt, 'score');
    requireValue(attempt, 'completedAt');

    if (typeof attempt.score !== 'number' || !Number.isFinite(attempt.score) || attempt.score < 0 || attempt.score > 100) {
      throw new TypeError('score must be a finite number from 0 to 100');
    }
    if (typeof attempt.passed !== 'boolean') {
      throw new TypeError('passed must be a boolean');
    }
    if (typeof attempt.completedAt !== 'string') {
      throw new TypeError('completedAt must be a string');
    }
    if (attempt.scenarioId !== undefined && typeof attempt.scenarioId !== 'string') {
      throw new TypeError('scenarioId must be a string');
    }
    if (attempt.policyVersion !== undefined && typeof attempt.policyVersion !== 'string') {
      throw new TypeError('policyVersion must be a string');
    }
  }

  function copyAttempt(attempt) {
    var copied = {
      simulatorId: attempt.simulatorId,
      scenarioVersion: attempt.scenarioVersion,
      rubricVersion: attempt.rubricVersion,
      score: attempt.score,
      passed: attempt.passed,
      completedAt: attempt.completedAt
    };
    if (attempt.scenarioId) copied.scenarioId = attempt.scenarioId;
    if (attempt.policyVersion) copied.policyVersion = attempt.policyVersion;
    return copied;
  }

  function sanitizeAttempts(attempts) {
    return (Array.isArray(attempts) ? attempts : []).reduce(function (safeAttempts, attempt) {
      try {
        validateAttempt(attempt || {});
        safeAttempts.push(copyAttempt(attempt));
      } catch (error) {
        // Ignore malformed historical records during migration. New writes are
        // still rejected by recordAttempt below.
      }
      return safeAttempts;
    }, []);
  }

  function readState(storage, storageKey) {
    var parsed;
    try {
      parsed = JSON.parse(storage.getItem(storageKey) || 'null');
    } catch (error) {
      return { state: emptyState(), migrated: true };
    }

    if (!parsed || !Array.isArray(parsed.attempts) || (parsed.version !== 1 && parsed.version !== STATE_VERSION)) {
      return { state: emptyState(), migrated: true };
    }

    var attempts = sanitizeAttempts(parsed.attempts);
    return {
      state: { version: STATE_VERSION, attempts: attempts },
      migrated: parsed.version !== STATE_VERSION || attempts.length !== parsed.attempts.length
    };
  }

  function createProgressStore(storage, storageKey) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
      throw new TypeError('A storage adapter with getItem and setItem is required');
    }

    var key = storageKey || DEFAULT_KEY;

    function writeState(state) {
      storage.setItem(key, JSON.stringify(state));
    }

    function publishToSimHub(attempt) {
      try {
        if (!root || !root.location) return;
        var target = (root.opener && root.opener !== root)
          ? root.opener
          : ((root.parent && root.parent !== root) ? root.parent : null);
        if (!target) return;
        var params = new URLSearchParams(root.location.search || '');
        var token = params.get('simhubBridgeToken');
        var returnOrigin = params.get('simhubReturnOrigin');
        if (!token || !returnOrigin) return;
        var parsedOrigin = new URL(returnOrigin);
        if (parsedOrigin.origin !== returnOrigin) return;
        target.postMessage({
          source: 'simhub-static-bridge',
          kind: 'simulator_attempt',
          token: token,
          attempt: attempt
        }, returnOrigin);
      } catch (error) {
        // SimHub bridge failures must never interrupt the existing local simulator flow.
      }
    }

    function loadState() {
      var loaded = readState(storage, key);
      if (loaded.migrated) writeState(loaded.state);
      return loaded.state;
    }

    function recordAttempt(attempt) {
      var safeAttempt = attempt || {};
      validateAttempt(safeAttempt);
      var state = loadState();
      var storedAttempt = copyAttempt(safeAttempt);
      state.attempts.push(storedAttempt);
      writeState(state);
      publishToSimHub(storedAttempt);
      return storedAttempt;
    }

    function getSimulatorProgress(simulatorId) {
      var attempts = loadState().attempts.filter(function (attempt) {
        return attempt.simulatorId === simulatorId;
      });
      var bestScore = attempts.reduce(function (best, attempt) {
        return Math.max(best, attempt.score);
      }, 0);
      var passed = attempts.some(function (attempt) { return attempt.passed; });

      return {
        simulatorId: simulatorId,
        status: attempts.length === 0 ? 'not_started' : (passed ? 'passed' : 'in_progress'),
        bestScore: bestScore,
        attemptCount: attempts.length,
        latestAttempt: attempts.length ? copyAttempt(attempts[attempts.length - 1]) : null
      };
    }

    return {
      recordAttempt: recordAttempt,
      getSimulatorProgress: getSimulatorProgress
    };
  }

  return {
    DEFAULT_KEY: DEFAULT_KEY,
    STATE_VERSION: STATE_VERSION,
    createProgressStore: createProgressStore,
    createLocalProgressStore: function () {
      return createProgressStore(localStorage, DEFAULT_KEY);
    }
  };
});
