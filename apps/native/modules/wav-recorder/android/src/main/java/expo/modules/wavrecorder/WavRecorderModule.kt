package expo.modules.wavrecorder

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.log10
import kotlin.math.sqrt

private const val HEADER_BYTES = 44
private const val MIN_DB = -160.0

/**
 * Records the microphone as mono 16-bit PCM WAV. Android's MediaRecorder has no WAV output, and
 * the server takes only WAV, so this reads AudioRecord directly. The permission is asked in JS.
 */
class WavRecorderModule : Module() {
  private var record: AudioRecord? = null
  private var worker: Thread? = null
  private var file: RandomAccessFile? = null
  private var path: String? = null
  private var rate = 16_000

  @Volatile private var bytes = 0L
  @Volatile private var running = false
  @Volatile private var meterDb = MIN_DB

  override fun definition() = ModuleDefinition {
    Name("WavRecorder")

    // Starts recording to a new file in the cache and returns its file:// uri.
    AsyncFunction("start") { sampleRate: Int ->
      stopRecording()
      val context = appContext.reactContext ?: throw CodedException("No context")
      val minBuffer = AudioRecord.getMinBufferSize(
        sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
      )
      if (minBuffer <= 0) throw CodedException("Cannot record at $sampleRate Hz")
      val audio = try {
        AudioRecord(
          MediaRecorder.AudioSource.MIC, sampleRate, AudioFormat.CHANNEL_IN_MONO,
          AudioFormat.ENCODING_PCM_16BIT, minBuffer * 2
        )
      } catch (e: SecurityException) {
        throw CodedException("The microphone is not allowed")
      }
      if (audio.state != AudioRecord.STATE_INITIALIZED) {
        audio.release()
        throw CodedException("The microphone could not start")
      }
      val out = File(context.cacheDir, "question-${System.nanoTime()}.wav")
      val raf = RandomAccessFile(out, "rw")
      raf.setLength(0)
      raf.write(ByteArray(HEADER_BYTES))
      rate = sampleRate
      record = audio
      file = raf
      path = out.toURI().toString()
      bytes = 0
      meterDb = MIN_DB
      running = true
      audio.startRecording()
      worker = Thread {
        val buffer = ByteArray(minBuffer)
        while (running) {
          val n = audio.read(buffer, 0, buffer.size)
          if (n <= 0) break
          raf.write(buffer, 0, n)
          bytes += n
          meterDb = decibels(buffer, n)
        }
      }.also { it.start() }
      path
    }

    // Stops, patches the WAV header and returns the file:// uri ("" when nothing was recording).
    AsyncFunction("stop") { stopRecording() ?: "" }

    // Loudness of the latest chunk in dB (about -160 silent to 0 loud), like expo-audio's metering.
    Function("level") { meterDb }

    OnDestroy { stopRecording() }
  }

  @Synchronized
  private fun stopRecording(): String? {
    val audio = record ?: return null
    running = false
    worker?.join()
    try {
      audio.stop()
    } catch (_: IllegalStateException) {
    }
    audio.release()
    val raf = file
    val done = path
    record = null
    worker = null
    file = null
    path = null
    if (raf != null) {
      val header = ByteBuffer.allocate(HEADER_BYTES).order(ByteOrder.LITTLE_ENDIAN)
      header.put("RIFF".toByteArray()).putInt((HEADER_BYTES - 8 + bytes).toInt())
      header.put("WAVE".toByteArray()).put("fmt ".toByteArray()).putInt(16)
      header.putShort(1).putShort(1).putInt(rate).putInt(rate * 2)
      header.putShort(2).putShort(16)
      header.put("data".toByteArray()).putInt(bytes.toInt())
      raf.seek(0)
      raf.write(header.array())
      raf.close()
    }
    return done
  }

  private fun decibels(buffer: ByteArray, n: Int): Double {
    val samples = ByteBuffer.wrap(buffer, 0, n).order(ByteOrder.LITTLE_ENDIAN).asShortBuffer()
    val count = samples.remaining()
    if (count == 0) return MIN_DB
    var sum = 0.0
    for (i in 0 until count) {
      val s = samples.get(i) / 32768.0
      sum += s * s
    }
    return maxOf(MIN_DB, 20 * log10(maxOf(sqrt(sum / count), 1e-8)))
  }
}
