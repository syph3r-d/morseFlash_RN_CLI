package com.morseflash_rn_cli

import android.content.Context
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraCharacteristics
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.morseflash_rn_cli.NativeFlashlightSpec

class NativeFlashlightModule(reactContext: ReactApplicationContext) : NativeFlashlightSpec(reactContext) {

  private val cameraManager = reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
  private var cameraId: String? = null
  private var maxBrightnessLevel: Int = 1
  private var defaultBrightnessLevel: Int = 1

  init {
    try {
      cameraId = cameraManager.cameraIdList.firstOrNull { camId ->
        val characteristics = cameraManager.getCameraCharacteristics(camId)
        val flashAvailable = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE)
        flashAvailable == true
      }
      cameraId?.let {
        val characteristics = cameraManager.getCameraCharacteristics(it)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          maxBrightnessLevel = characteristics.get(CameraCharacteristics.FLASH_INFO_STRENGTH_MAXIMUM_LEVEL) ?: 1
          defaultBrightnessLevel = characteristics.get(CameraCharacteristics.FLASH_INFO_STRENGTH_DEFAULT_LEVEL) ?: 1
        } else {
          maxBrightnessLevel = 1 // Brightness control not supported
          defaultBrightnessLevel = 1
        }
      }
    } catch (e: Exception) {
      e.printStackTrace()
      // cameraId will remain null, and brightness levels will be default
    }
  }

  companion object {
    const val NAME = "NativeFlashlight"
  }

  override fun getName(): String {
    return NAME
  }

  // Helper to get current torch state (ON/OFF)
  // This is a simplified version. A robust solution might need a TorchCallback.
  private var isTorchOn: Boolean = false 

  override fun turnOn() {
    toggleFlashlight(true, defaultBrightnessLevel) 
  }

  override fun turnOff() {
    toggleFlashlight(false, 0) // Brightness level is irrelevant when turning off
  }

  override fun setBrightness(brightness: Double) {
    cameraId?.let {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && maxBrightnessLevel > 1) {
        val level = (brightness * (maxBrightnessLevel -1 )).toInt() + 1 // Map 0.0-1.0 to 1-maxLevel
        val clampedLevel = level.coerceIn(1, maxBrightnessLevel)
        try {
          // Only call turnOnTorchWithStrengthLevel if torch is supposed to be on.
          // If it's off, this call would turn it on with the new brightness.
          // We might want to only set brightness if the torch is already on, 
          // or allow this method to also turn it on.
          // For now, let's assume it also turns it on if it's off.
          if (clampedLevel >=1) { // Ensure level is valid before turning on
            cameraManager.turnOnTorchWithStrengthLevel(it, clampedLevel)
            isTorchOn = true
          } else {
            // If brightness is 0, effectively turn off the torch.
            cameraManager.setTorchMode(it, false)
            isTorchOn = false
          }
        } catch (e: Exception) {
          e.printStackTrace()
        }
      } else {
        // Brightness control not supported or no flash, turn on with default method if brightness > 0
        if (brightness > 0) {
            cameraManager.setTorchMode(it, true)
            isTorchOn = true
        } else {
            cameraManager.setTorchMode(it, false)
            isTorchOn = false
        }
      }
    }
  }

  private fun toggleFlashlight(state: Boolean, strength: Int) {
    cameraId?.let {
      try {
        if (state) {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && maxBrightnessLevel > 1 && strength > 0) {
            cameraManager.turnOnTorchWithStrengthLevel(it, strength.coerceIn(1, maxBrightnessLevel))
          } else {
            cameraManager.setTorchMode(it, true)
          }
          isTorchOn = true
        } else {
          cameraManager.setTorchMode(it, false)
          isTorchOn = false
        }
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  override fun getConstants(): MutableMap<String, Any> {
    val constants = mutableMapOf<String, Any>()
    constants["maxBrightnessLevel"] = maxBrightnessLevel
    constants["defaultBrightnessLevel"] = defaultBrightnessLevel
    constants["isBrightnessControlSupported"] = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && maxBrightnessLevel > 1 && cameraId != null
    return constants
  }
}
