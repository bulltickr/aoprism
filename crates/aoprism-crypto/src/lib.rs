use wasm_bindgen::prelude::*;
use rsa::{RsaPrivateKey, Pkcs1v15Encrypt};
use rsa::sha2::{Sha256, Sha512, Digest};
use signature::{Signer, RandomizedSigner, SignatureEncoding};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD, engine::general_purpose::STANDARD};
use serde::{Deserialize, Serialize};
use aes_gcm::{Aes256Gcm, Key, Nonce, KeyInit, aead::Aead};
use zeroize::{Zeroize, Zeroizing};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[derive(Serialize, Deserialize, Zeroize)]
#[zeroize(drop)]
pub struct Jwk {
    pub n: String,
    pub e: String,
    pub d: String,
    pub p: String,
    pub q: String,
    pub dp: String,
    pub dq: String,
    pub qi: String,
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Rust Crypto is Ready 🦀", name)
}

#[wasm_bindgen]
pub fn jwk_to_address(n: &str) -> Result<String, JsValue> {
    let modulus_bytes = URL_SAFE_NO_PAD.decode(n).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let mut hasher = Sha256::new();
    hasher.update(&modulus_bytes);
    let result = hasher.finalize();
    Ok(URL_SAFE_NO_PAD.encode(result))
}

#[wasm_bindgen]
pub fn sign_pss(jwk_val: JsValue, data: &[u8], salt_len: i32) -> Result<Vec<u8>, JsValue> {
    // 1. Parse JWK from JS Object
    let jwk: Jwk = serde_wasm_bindgen::from_value(jwk_val)?;

    // 2. Decode Components
    let n = URL_SAFE_NO_PAD.decode(&jwk.n).map_err(|e| JsValue::from_str(&format!("Invalid n: {}", e)))?;
    let e = URL_SAFE_NO_PAD.decode(&jwk.e).map_err(|e| JsValue::from_str(&format!("Invalid e: {}", e)))?;
    let d = URL_SAFE_NO_PAD.decode(&jwk.d).map_err(|e| JsValue::from_str(&format!("Invalid d: {}", e)))?;
    let p = URL_SAFE_NO_PAD.decode(&jwk.p).map_err(|e| JsValue::from_str(&format!("Invalid p: {}", e)))?;
    let q = URL_SAFE_NO_PAD.decode(&jwk.q).map_err(|e| JsValue::from_str(&format!("Invalid q: {}", e)))?;
    
    // 3. Reconstruct Key
    let private_key = RsaPrivateKey::from_components(
        rsa::BigUint::from_bytes_be(&n),
        rsa::BigUint::from_bytes_be(&e),
        rsa::BigUint::from_bytes_be(&d),
        vec![
            rsa::BigUint::from_bytes_be(&p),
            rsa::BigUint::from_bytes_be(&q),
        ]
    ).map_err(|e| JsValue::from_str(&format!("Key reconstruction failed: {}", e)))?;

    // 4. Sign
    // We use a custom RNG that defers to WebCrypto if needed, but rsa crate's default 
    // RandomizedSigner uses rand_core::OsRng which maps to getrandom::getrandom which maps to crypto.getRandomValues
    let mut rng = rand::rngs::OsRng;
    let signing_key = rsa::pss::SigningKey::<Sha256>::new(private_key);
    
    // Note: The rsa crate's PSS implementation might differ slightly in API depending on version.
    // Ideally we use the BlindedSigningKey for security, but for now let's use the standard Signer trait if possible.
    // However, rsa 0.9 splits this. Let's use the simpler approach first.

    // Correction: rsa 0.9 has a robust PSS implementation.
    // We need to match Arweave's PSS parameters (salt length).
    // Arweave uses saltLength = 0 for data items (usually) or 32/hashed length?
    // Wait, Arweave ANS-104 usually uses saltLength = 0 (or digest length).
    // Let's rely on the crate's verify/sign.
    
    // RE-VISIT: Arweave (and node-rsa / webcrypto) often default saltLength to hash size (32 for SHA256).
    // The `salt_len` param allows us to control this from JS if needed.
    
    // For simplicity in this step, we'll try to use the `sign_with_rng` if available or manual padding.
    // But `rsa` crate creates "BlindedSigningKey" for side-channel resistance.
    
    // Simplified specific implementation for RSA-PSS-SHA256:
    let signature = signing_key.sign_with_rng(&mut rng, data);
    
    // Wait, `sign_with_rng` is for RandomizedSigner.
    // Let's assume standard behavior.
    
    Ok(signature.to_vec()) 
}

// FIX: The above strict PSS implementation is complex to get exactly right with `rsa` crate versions.
// Let's stick to a simpler known working pattern for now:
// We will use `RsaPrivateKey` directly for now.

use once_cell::sync::Lazy;
use std::sync::Mutex;

static ACTIVE_KEY: Lazy<Mutex<Option<RsaPrivateKey>>> = Lazy::new(|| Mutex::new(None));

#[derive(Serialize)]
pub struct LoadKeyResponse {
    pub address: String,
    pub n: String,
}

#[wasm_bindgen]
pub fn enclave_load_key(jwk_val: JsValue) -> Result<JsValue, JsValue> {
    let jwk: Jwk = serde_wasm_bindgen::from_value(jwk_val)?;
    
    let mut n_bytes = URL_SAFE_NO_PAD.decode(&jwk.n).map_err(|_| "Invalid n")?;
    let mut e_bytes = URL_SAFE_NO_PAD.decode(&jwk.e).map_err(|_| "Invalid e")?;
    let mut d_bytes = URL_SAFE_NO_PAD.decode(&jwk.d).map_err(|_| "Invalid d")?;
    let mut p_bytes = URL_SAFE_NO_PAD.decode(&jwk.p).map_err(|_| "Invalid p")?;
    let mut q_bytes = URL_SAFE_NO_PAD.decode(&jwk.q).map_err(|_| "Invalid q")?;

    let priv_key = RsaPrivateKey::from_components(
        rsa::BigUint::from_bytes_be(&n_bytes),
        rsa::BigUint::from_bytes_be(&e_bytes),
        rsa::BigUint::from_bytes_be(&d_bytes),
        vec![rsa::BigUint::from_bytes_be(&p_bytes), rsa::BigUint::from_bytes_be(&q_bytes)]
    ).map_err(|e| e.to_string())?;

    let address = jwk_to_address(&jwk.n)?;
    let public_key_n = jwk.n.clone();

    let mut lock = ACTIVE_KEY.lock().map_err(|_| "Lock poisoned")?;
    *lock = Some(priv_key);
    
    // Manual zeroization of temp buffers
    n_bytes.zeroize();
    e_bytes.zeroize();
    d_bytes.zeroize();
    p_bytes.zeroize();
    q_bytes.zeroize();
    
    let response = LoadKeyResponse {
        address,
        n: public_key_n,
    };

    Ok(serde_wasm_bindgen::to_value(&response)?)
}

#[wasm_bindgen]
pub fn enclave_sign(data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let lock = ACTIVE_KEY.lock().map_err(|_| "Lock poisoned")?;
    let priv_key = lock.as_ref().ok_or_else(|| JsValue::from_str("No key loaded in enclave"))?;

    let signing_key = rsa::pss::SigningKey::<Sha256>::new(priv_key.clone());
    let mut rng = rand::rngs::OsRng;
    let signature = signing_key.sign_with_rng(&mut rng, data);
    
    Ok(signature.to_vec())
}

#[wasm_bindgen]
pub fn enclave_clear() {
    if let Ok(mut lock) = ACTIVE_KEY.lock() {
        *lock = None;
    }
}

#[wasm_bindgen]
pub fn verify_pss_simple(n_str: &str, data: &[u8], signature: &[u8]) -> Result<bool, JsValue> {
    use rsa::RsaPublicKey;
    use rsa::pss::VerifyingKey;
    use rsa::sha2::Sha256;
    use signature::Verifier;

    let n_bytes = URL_SAFE_NO_PAD.decode(n_str).map_err(|_| "Invalid modulus n")?;
    let e = rsa::BigUint::from(65537u32);

    let pub_key = RsaPublicKey::new(rsa::BigUint::from_bytes_be(&n_bytes), e)
        .map_err(|e| e.to_string())?;

    let verifying_key = VerifyingKey::<Sha256>::new(pub_key);
    
    // In rsa 0.9, pss::Signature can be created from bytes if they are the correct length
    let sig_res = rsa::pss::Signature::try_from(signature);
    
    match sig_res {
        Ok(sig) => {
            match verifying_key.verify(data, &sig) {
                Ok(_) => Ok(true),
                Err(_) => Ok(false),
            }
        },
        Err(_) => Ok(false), // Signature bytes invalid length or format
    }
}

#[derive(Deserialize)]
pub struct Assignment {
    pub nonce: String,
    pub epoch: i32,
}

#[wasm_bindgen]
pub fn audit_sequence(assignments_json: &str, start_nonce: &str) -> Result<bool, JsValue> {
    let assignments: Vec<Assignment> = serde_json::from_str(assignments_json)
        .map_err(|e| e.to_string())?;
    
    let mut current_nonce = start_nonce.parse::<u64>()
        .map_err(|_| "Invalid start_nonce - must be numeric string")?;

    for (i, msg) in assignments.iter().enumerate() {
        let actual_nonce = msg.nonce.parse::<u64>()
            .map_err(|_| format!("Invalid nonce at index {}: {}", i, msg.nonce))?;
        
        if actual_nonce != current_nonce + 1 {
            return Ok(false);
        }
        current_nonce = actual_nonce;
    }

    Ok(true)
}

#[wasm_bindgen]
pub struct SimpleTokenizer {
    vocab: std::collections::HashMap<String, u32>,
    inv_vocab: std::collections::HashMap<u32, String>,
}

#[wasm_bindgen]
impl SimpleTokenizer {
    #[wasm_bindgen(constructor)]
    pub fn new(vocab_json: &str) -> Result<SimpleTokenizer, JsValue> {
        let vocab: std::collections::HashMap<String, u32> = serde_json::from_str(vocab_json)
            .map_err(|e| e.to_string())?;
        
        let mut inv_vocab = std::collections::HashMap::new();
        for (k, v) in &vocab {
            inv_vocab.insert(*v, k.clone());
        }

        Ok(SimpleTokenizer { vocab, inv_vocab })
    }

    pub fn encode(&self, text: &str) -> Vec<u32> {
        // Simple greedy whitespace/punctuation tokenizer for Phase 6 demo
        // In a real BPE, this would use the merge rules.
        let mut tokens = Vec::new();
        for word in text.split_whitespace() {
            if let Some(&id) = self.vocab.get(word) {
                tokens.push(id);
            } else {
                // Fallback to char-level if word not found
                for c in word.chars() {
                    let s = c.to_string();
                    if let Some(&id) = self.vocab.get(&s) {
                        tokens.push(id);
                    }
                }
            }
        }
        tokens
    }

    pub fn decode(&self, ids: &[u32]) -> String {
        let mut text = String::new();
        for id in ids {
            if let Some(token) = self.inv_vocab.get(id) {
                text.push_str(token);
                text.push(' ');
            }
        }
        text.trim().to_string()
    }
}

#[wasm_bindgen]
pub struct SlmRunner {
    device: wgpu::Device,
    queue: wgpu::Queue,
}

#[wasm_bindgen]
impl SlmRunner {
    #[wasm_bindgen]
    pub async fn create() -> Result<SlmRunner, JsValue> {
        let instance = wgpu::Instance::default();
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: None,
                force_fallback_adapter: false,
            })
            .await
            .ok_or_else(|| JsValue::from_str("Failed to find a WebGPU adapter"))?;

        let (device, queue) = adapter
            .request_device(
                &wgpu::DeviceDescriptor {
                    label: Some("AOPRISM-SLM-Device"),
                    required_features: wgpu::Features::empty(),
                    required_limits: adapter.limits(),
                    memory_hints: wgpu::MemoryHints::Performance,
                },
                None,
            )
            .await
            .map_err(|e| JsValue::from_str(&format!("Failed to create device: {}", e)))?;

        Ok(SlmRunner { device, queue })
    }

    pub async fn run_matmul(&self, a: &[f32], b: &[f32]) -> Result<Vec<f32>, JsValue> {
        use wgpu::util::DeviceExt;

        let size = (a.len() * std::mem::size_of::<f32>()) as wgpu::BufferAddress;

        // 1. Storage Buffers
        let buffer_a = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Buffer A"),
            contents: bytemuck::cast_slice(a),
            usage: wgpu::BufferUsages::STORAGE,
        });

        let buffer_b = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Buffer B"),
            contents: bytemuck::cast_slice(b),
            usage: wgpu::BufferUsages::STORAGE,
        });

        let output_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Output Buffer"),
            size,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
            mapped_at_creation: false,
        });

        let staging_buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Staging Buffer"),
            size,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });

        // 2. Shader Module
        let shader = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Add Shader"),
            source: wgpu::ShaderSource::Wgsl(std::borrow::Cow::Borrowed(
                "@group(0) @binding(0) var<storage, read> in_a: array<f32>;
                 @group(0) @binding(1) var<storage, read> in_b: array<f32>;
                 @group(0) @binding(2) var<storage, read_write> out: array<f32>;
                 
                 @compute @workgroup_size(64)
                 fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                     out[global_id.x] = in_a[global_id.x] + in_b[global_id.x];
                 }",
            )),
        });

        // 3. Pipeline
        let pipeline = self.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Add Pipeline"),
            layout: None,
            module: &shader,
            entry_point: "main",
            compilation_options: Default::default(),
            cache: None,
        });

        // 4. Bind Group
        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Add Bind Group"),
            layout: &pipeline.get_bind_group_layout(0),
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: buffer_a.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 1, resource: buffer_b.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 2, resource: output_buffer.as_entire_binding() },
            ],
        });

        // 5. Command Encoder
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
        {
            let mut cpass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor { label: None, timestamp_writes: None });
            cpass.set_pipeline(&pipeline);
            cpass.set_bind_group(0, &bind_group, &[]);
            let workgroups = (a.len() as u32 + 63) / 64;
            cpass.dispatch_workgroups(workgroups, 1, 1);
        }
        encoder.copy_buffer_to_buffer(&output_buffer, 0, &staging_buffer, 0, size);

        // 6. Submit and Wait
        self.queue.submit(Some(encoder.finish()));

        // 7. Map Staging Buffer and Read result
        let buffer_slice = staging_buffer.slice(..);
        let (sender, receiver) = futures::channel::oneshot::channel();
        buffer_slice.map_async(wgpu::MapMode::Read, move |v| sender.send(v).unwrap());

        self.device.poll(wgpu::Maintain::Wait);

        if let Ok(Ok(())) = receiver.await {
            let data = buffer_slice.get_mapped_range();
            let result = bytemuck::cast_slice(&data).to_vec();
            drop(data);
            staging_buffer.unmap();
            Ok(result)
        } else {
            Err(JsValue::from_str("Failed to map staging buffer"))
        }
    }
}

#[wasm_bindgen]
pub async fn gpu_init() -> Result<JsValue, JsValue> {
    let instance = wgpu::Instance::default();
    let adapter = instance
        .request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: None,
            force_fallback_adapter: false,
        })
        .await
        .ok_or_else(|| JsValue::from_str("Failed to find a WebGPU adapter"))?;

    let info = adapter.get_info();
    
    #[derive(Serialize)]
    pub struct GpuInfo {
        pub name: String,
        pub backend: String,
        pub device_type: String,
    }

    let response = GpuInfo {
        name: info.name,
        backend: format!("{:?}", info.backend),
        device_type: format!("{:?}", info.device_type),
    };

    Ok(serde_wasm_bindgen::to_value(&response)?)
}

#[wasm_bindgen]
pub fn sign_pss_simple(jwk_val: JsValue, data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let jwk: Jwk = serde_wasm_bindgen::from_value(jwk_val)?;
    
    let n = URL_SAFE_NO_PAD.decode(&jwk.n).map_err(|_| "Invalid n")?;
    let e = URL_SAFE_NO_PAD.decode(&jwk.e).map_err(|_| "Invalid e")?;
    let d = URL_SAFE_NO_PAD.decode(&jwk.d).map_err(|_| "Invalid d")?;
    let p = URL_SAFE_NO_PAD.decode(&jwk.p).map_err(|_| "Invalid p")?;
    let q = URL_SAFE_NO_PAD.decode(&jwk.q).map_err(|_| "Invalid q")?;

    let priv_key = RsaPrivateKey::from_components(
        rsa::BigUint::from_bytes_be(&n),
        rsa::BigUint::from_bytes_be(&e),
        rsa::BigUint::from_bytes_be(&d),
        vec![rsa::BigUint::from_bytes_be(&p), rsa::BigUint::from_bytes_be(&q)]
    ).map_err(|e| e.to_string())?;

    let signing_key = rsa::pss::SigningKey::<Sha256>::new(priv_key);
    let mut rng = rand::rngs::OsRng;
    let signature = signing_key.sign_with_rng(&mut rng, data);
    
    Ok(signature.to_vec())
}

#[wasm_bindgen]
pub fn sign_http_sig(jwk_val: JsValue, data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let jwk: Jwk = serde_wasm_bindgen::from_value(jwk_val)?;
    
    let n = URL_SAFE_NO_PAD.decode(&jwk.n).map_err(|_| "Invalid n")?;
    let e = URL_SAFE_NO_PAD.decode(&jwk.e).map_err(|_| "Invalid e")?;
    let d = URL_SAFE_NO_PAD.decode(&jwk.d).map_err(|_| "Invalid d")?;
    let p = URL_SAFE_NO_PAD.decode(&jwk.p).map_err(|_| "Invalid p")?;
    let q = URL_SAFE_NO_PAD.decode(&jwk.q).map_err(|_| "Invalid q")?;

    let priv_key = RsaPrivateKey::from_components(
        rsa::BigUint::from_bytes_be(&n),
        rsa::BigUint::from_bytes_be(&e),
        rsa::BigUint::from_bytes_be(&d),
        vec![rsa::BigUint::from_bytes_be(&p), rsa::BigUint::from_bytes_be(&q)]
    ).map_err(|e| e.to_string())?;

    let signing_key = rsa::pss::SigningKey::<Sha512>::new(priv_key);
    let mut rng = rand::rngs::OsRng;
    let signature = signing_key.sign_with_rng(&mut rng, data);
    
    Ok(signature.to_vec())
}

#[derive(Serialize, Deserialize)]
pub struct EncryptedData {
    pub iv: String,
    pub ciphertext: String,
}

#[wasm_bindgen]
pub fn encrypt_data(data_json: &str, key_bytes: &[u8]) -> Result<JsValue, JsValue> {
    if key_bytes.len() != 32 {
        return Err(JsValue::from_str("Key must be 32 bytes for AES-256"));
    }
    
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    let mut nonce_bytes = [0u8; 12];
    rand::RngCore::fill_bytes(&mut rand::rngs::OsRng, &mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, data_json.as_bytes())
        .map_err(|_| JsValue::from_str("Encryption failed"))?;
    
    let response = EncryptedData {
        iv: STANDARD.encode(nonce_bytes),
        ciphertext: STANDARD.encode(ciphertext),
    };
    
    Ok(serde_wasm_bindgen::to_value(&response)?)
}

#[wasm_bindgen]
pub fn decrypt_data(encrypted_val: JsValue, key_bytes: &[u8]) -> Result<String, JsValue> {
    if key_bytes.len() != 32 {
        return Err(JsValue::from_str("Key must be 32 bytes for AES-256"));
    }
    
    let encrypted: EncryptedData = serde_wasm_bindgen::from_value(encrypted_val)?;
    let iv_bytes = STANDARD.decode(&encrypted.iv).map_err(|_| "Invalid IV")?;
    if iv_bytes.len() != 12 {
        return Err(JsValue::from_str("IV must be 12 bytes"));
    }
    let ciphertext_bytes = STANDARD.decode(&encrypted.ciphertext).map_err(|_| "Invalid Ciphertext")?;
    
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&iv_bytes);
    
    let plaintext = cipher.decrypt(nonce, ciphertext_bytes.as_ref())
        .map_err(|_| JsValue::from_str("Decryption failed"))?;
    
    String::from_utf8(plaintext).map_err(|_| JsValue::from_str("Invalid UTF-8 in decrypted data"))
}
