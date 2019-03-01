<?php

$first = file_get_contents('http://142.93.72.14:40/socket.io/?EIO=3&transport=polling');
$start = strpos($first, '{');
$end = strrpos($first, '}');
$first = substr($first, $start, $end - $start + 1);
$firstJson = json_decode($first, true);

sleep(1);

$init = file_get_contents("http://142.93.72.14:40/socket.io/?EIO=3&transport=polling&sid=" . $firstJson['sid']);
$start = strpos($init, '[');
$end = strrpos($init, ']]]');
$init = substr($init, $start, $end - $start + 4);
echo $init;