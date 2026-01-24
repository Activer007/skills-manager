use tokio_util::sync::CancellationToken;

#[derive(Clone, Debug)]
pub struct TaskCancellationToken {
    token: CancellationToken,
}

impl TaskCancellationToken {
    pub fn new() -> Self {
        Self {
            token: CancellationToken::new(),
        }
    }

    pub fn cancel(&self) {
        self.token.cancel();
    }

    pub fn is_cancelled(&self) -> bool {
        self.token.is_cancelled()
    }

    pub async fn cancelled(&self) {
        self.token.cancelled().await;
    }

    pub fn child_token(&self) -> Self {
        Self {
            token: self.token.child_token(),
        }
    }
}

impl Default for TaskCancellationToken {
    fn default() -> Self {
        Self::new()
    }
}
