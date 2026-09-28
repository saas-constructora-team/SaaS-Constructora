CREATE TABLE event_publication (
    id                  UUID NOT NULL,
    listener_id         VARCHAR(255) NOT NULL,
    event_type          VARCHAR(255) NOT NULL,
    serialized_event    VARCHAR(4096) NOT NULL,
    publication_date    TIMESTAMP WITH TIME ZONE NOT NULL,
    completion_date     TIMESTAMP WITH TIME ZONE,
    completion_attempts INTEGER NOT NULL DEFAULT 0,
    last_resubmission_date TIMESTAMP WITH TIME ZONE,
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    PRIMARY KEY (id)
);

CREATE INDEX idx_event_publication_completion_date ON event_publication (completion_date);
CREATE INDEX idx_event_publication_publication_date ON event_publication (publication_date);