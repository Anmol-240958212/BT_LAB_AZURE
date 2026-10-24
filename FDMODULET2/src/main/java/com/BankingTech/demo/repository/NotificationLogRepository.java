package com.BankingTech.demo.repository;

import com.BankingTech.demo.entity.NotificationLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface NotificationLogRepository
        extends JpaRepository<NotificationLogEntity, String> {

    List<NotificationLogEntity> findTop50ByNotificationLogStatusInAndNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(
            List<String> statuses, LocalDateTime now);

    @Modifying
    @Transactional
    @Query("update NotificationLogEntity n set n.notificationLogStatus = 'PUBLISHING', n.nextAttemptAt = :lease "
            + "where n.notificationLogId = :id and n.notificationLogStatus in ('QUEUED', 'FAILED', 'PUBLISHING', 'PUBLISHED') "
            + "and n.nextAttemptAt <= :now")
    int claimForPublishing(@Param("id") String id, @Param("now") LocalDateTime now, @Param("lease") LocalDateTime lease);

    @Modifying
    @Transactional
    @Query("update NotificationLogEntity n set n.notificationLogStatus = 'PUBLISHED', n.notificationLogErrorMessage = null "
            + "where n.notificationLogId = :id and n.notificationLogStatus = 'PUBLISHING'")
    int markPublished(@Param("id") String id);

    @Modifying
    @Transactional
    @Query("update NotificationLogEntity n set n.notificationLogStatus = 'FAILED', n.notificationLogErrorMessage = :error, "
            + "n.nextAttemptAt = :retry where n.notificationLogId = :id and n.notificationLogStatus = 'PUBLISHING'")
    int markPublishFailed(@Param("id") String id, @Param("error") String error, @Param("retry") LocalDateTime retry);

    List<NotificationLogEntity> findByNotificationLogFdAccountNo(
            String fdAccountNo);

    List<NotificationLogEntity> findByNotificationLogCustomerId(
            String customerId);
}
