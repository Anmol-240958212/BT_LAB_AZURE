package com.example.auth.repository;

import com.example.auth.entity.LoginAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.auth.entity.AuthUsr;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface LoginAuditRepository extends JpaRepository<LoginAudit, Long> {
    Optional<LoginAudit> findTopByUserAndLoginStatusOrderByLoginTimestampDesc(AuthUsr user, String loginStatus);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) FROM LoginAudit a WHERE a.ipAddress = :ip AND a.loginStatus = 'FAILED' AND a.loginTimestamp >= :since")
    long countFailedByIpInWindow(@org.springframework.data.repository.query.Param("ip") String ip, @org.springframework.data.repository.query.Param("since") LocalDateTime since);
}
